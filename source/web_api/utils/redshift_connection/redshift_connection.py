from __future__ import print_function
import psycopg2
import time
from psycopg2.extras import execute_values
from source import common_constants


class RedshiftConnection(object):
    def __init__(self):
        # Defining environment variables for accessing private information
        self.E_AWS_RS_USER = common_constants.REDSHIFT_USERNAME
        self.E_AWS_RS_PASS = common_constants.REDSHIFT_PASSWORD
        self.DATABASE_NAME = common_constants.REDSHIFT_DATABASE_NAME
        self.REDSHIFT_PORT = common_constants.REDSHIFT_PORT
        self.CLUSTER_ENDPOINT = common_constants.REDSHIFT_CLUSTER_ENDPOINT

        # Connect to the Vger Redshift DB
        self.conn = psycopg2.connect(dbname=self.DATABASE_NAME, host=self.CLUSTER_ENDPOINT, port=self.REDSHIFT_PORT,
                                     user=self.E_AWS_RS_USER, password=self.E_AWS_RS_PASS)
        self.cur = self.conn.cursor()

    def executeCommitFetchAll(self, query):
        self.cur.execute(query)
        self.conn.commit()
        queryResults = self.cur.fetchall()
        return queryResults

    def executeCommitFetchOne(self, query):
        self.cur.execute(query)
        self.conn.commit()
        queryResults = self.cur.fetchone()
        return queryResults

    def closeConnection(self):
        self.cur.close()
        self.conn.close()

    def getConn(self):
        return self.conn

    def getCursor(self):
        return self.cur

    def validateProjectID(self, projectID):
        selectID = "SELECT name, id FROM team_project WHERE id = %s"
        self.cur.execute(selectID, (projectID,))
        IDResults = self.cur.fetchone()
        if not IDResults:
            raise Exception

    def validateTeamName(self, teamName):
        '''
        rtype:  boolean
        return: True if queried team name exists
        '''
        selectTeamName = "SELECT id FROM team WHERE name = %s"
        self.cur.execute(selectTeamName, (teamName,))
        valid = self.cur.fetchone()
        return True if valid else False

    def validate_team_by_id(self, team_id):
        select_team_id_query = "SELECT name, id FROM team WHERE id = %s"
        self.cur.execute(select_team_id_query, (team_id,))
        valid = self.cur.fetchone()
        return True if valid else False

    def validateProjectName(self, projectName):
        '''
        rtype:  boolean
        return: True if queried project name exists
        '''
        selectProjectName = "SELECT id FROM team_project WHERE LOWER(name) = LOWER(%s)"
        self.cur.execute(selectProjectName, (projectName,))
        valid = self.cur.fetchone()
        return True if valid else False

    def validateProjectNameChange(self, projectID, projectName):
        '''
        rtype:  boolean
        return: True if queried project name exists in other projects
        '''
        selectProjectName = "SELECT id FROM team_project WHERE LOWER(name) = LOWER(%s)"
        self.cur.execute(selectProjectName, (projectName,))
        valid = self.cur.fetchone()
        return valid and projectID != valid[0]

    def insertTeam(self, team):
        insertTeam = "INSERT INTO team (name) VALUES (%s)"
        self.cur.execute(insertTeam, (team,))
        self.conn.commit()

    def insertTeamProject(self, teamProject, teamId, jiraBoardName, jiraBoardID, jiraIssueFilter,
                          defaultLeadTimeStartState,
                          defaultLeadTimeEndState, rollingTimeWindowDays, includeSubtasks, excludedIssueTypesStr):
        insertTeamProject = """
        INSERT INTO team_project ( name,
                                   team_id,
                                   board_name,
                                   board_id,
                                   issue_filter,
                                   default_lead_time_start_state,
                                   default_lead_time_end_state,
                                   rolling_time_window_days,
                                   include_subtasks,
                                   excluded_issue_types )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        self.cur.execute(insertTeamProject, (
            teamProject,
            teamId,
            jiraBoardName,
            jiraBoardID,
            jiraIssueFilter,
            defaultLeadTimeStartState,
            defaultLeadTimeEndState,
            rollingTimeWindowDays,
            includeSubtasks,
            excludedIssueTypesStr
        ))
        self.conn.commit()

    def updateDefaultLeadTimeStates(self, projectID, startState, endState):
        updateLeadTime = """
        UPDATE team_project
        SET default_lead_time_start_state = %s, default_lead_time_end_state = %s
        WHERE id = %s
        """
        self.cur.execute(updateLeadTime, (startState, endState, projectID))
        self.conn.commit()

    def updateIssues(self, projectID, boardName, includeSubtasks, issueFilter,
                     allIssueTypes, excludedTypesList, projectName):
        try:
            existsTypesQuery = "SELECT issue_type FROM team_work_types WHERE team_project_id = %s"
            self.cur.execute(existsTypesQuery, (projectID,))
            fetch_results = self.cur.fetchall()
            existsTypesList = [result[0] for result in fetch_results]

            excludedIssueTypes = ','.join(excludedTypesList)

            currentIssueFilterQuery = "SELECT issue_filter FROM team_project WHERE id = %s"
            self.cur.execute(currentIssueFilterQuery, (projectID,))
            currentFilter = self.cur.fetchone()[0]
            if currentFilter != issueFilter:
                resetWatermark = "UPDATE team_project SET last_issue_change = 0 WHERE id = %s"
                self.cur.execute(resetWatermark, (projectID,))
                resetIssueChange = """
                DELETE FROM issue_change
                WHERE team_project_id = %s
                """
                self.cur.execute(resetIssueChange, (projectID,))
                resetWorkType = """
                DELETE FROM team_work_types
                WHERE team_project_id = %s
                """
                self.cur.execute(resetWorkType, (projectID,))
                resetIssueType = """
                DELETE FROM team_jira_issue_types
                WHERE team_project_id = %s
                """
                self.cur.execute(resetIssueType, (projectID,))

            removeTypesList = excludedTypesList
            if not includeSubtasks:
                if all([issueType['subtask'] for issueType in allIssueTypes]):
                    raise ValueError("All issue types are sub tasks. Sub tasks need to be included all the time.")
                removeTypesList.extend([issueType['name'] for issueType in allIssueTypes if issueType['subtask']])
            allIssueTypes = [issueType['name'] for issueType in allIssueTypes if
                             (includeSubtasks or not issueType['subtask'])]

            insertIssueTypeList = [issueType for issueType in allIssueTypes if
                                   issueType not in existsTypesList and issueType not in excludedTypesList]
            if allIssueTypes and set(existsTypesList).issubset(set(removeTypesList)) and not insertIssueTypeList:
                raise ValueError(
                    "You have excluded all issue types allowed for this project. Please include at least one issue type.")

            updateIssues = """
            UPDATE team_project
            SET name = %s, board_name = %s, include_subtasks = %s, excluded_issue_types = %s, issue_filter = %s
            WHERE id = %s
            """
            self.cur.execute(updateIssues, (projectName, boardName, includeSubtasks, excludedIssueTypes, issueFilter,
                                            projectID))

            for issueType in insertIssueTypeList:
                insertIssueType = """
                INSERT INTO team_work_types (team_project_id, issue_type, work_type)
                VALUES (%s, %s, %s)
                """
                self.cur.execute(insertIssueType, (projectID, issueType, issueType))

            if removeTypesList:
                deleteIssueType = """
                DELETE FROM team_work_types
                WHERE team_project_id = %s
                AND issue_type IN %s
                """
                self.cur.execute(deleteIssueType, (projectID, tuple(removeTypesList)))

            self.conn.commit()
            # Transaction block ends
        except Exception as e:
            self.closeConnection()
            raise e

    def updateTeamStatusStates(self, projectID, statusStatesList):
        self.cur.execute("DELETE FROM team_status_states WHERE team_project_id = %s", (projectID,))
        insertStatusStates = "INSERT INTO team_status_states (team_project_id, status, state_name) VALUES %s"
        execute_values(self.cur, insertStatusStates, statusStatesList)
        self.conn.commit()

    def updateTeamWorkStates(self, projectID, workStatesList):
        self.cur.execute("DELETE FROM team_work_states WHERE team_project_id = %s", (projectID,))
        insertWorkStates = "INSERT INTO team_work_states (team_project_id, state_name, seq_number) VALUES %s"
        execute_values(self.cur, insertWorkStates, workStatesList)
        self.conn.commit()

    def updateTeamWorkTypes(self, projectID, workTypesList):
        self.cur.execute("DELETE FROM team_work_types WHERE team_project_id = %s", (projectID,))
        insertWorkTypes = "INSERT INTO team_work_types (team_project_id, issue_type, work_type) VALUES %s"
        execute_values(self.cur, insertWorkTypes, workTypesList)
        self.conn.commit()

    def updateTeamRepos(self, projectID, reposList):
        self.cur.execute("DELETE FROM team_repo WHERE team_project_id = %s", (projectID,))
        insertTeamRepos = "INSERT INTO team_repo (team_project_id, repo_name) VALUES %s"
        execute_values(self.cur, insertTeamRepos, reposList)
        self.conn.commit()

    def statusListOfState(self, projectID, stateName):
        '''
        rtype:  list[str]
        return: all possible status states of the project
        '''
        selectStatusQuery = """
        SELECT status
        FROM team_status_states
        WHERE team_project_id = %s
        AND state_name = %s
        """
        self.cur.execute(selectStatusQuery, (projectID, stateName))
        stateResults = self.cur.fetchall()
        statuses = [result[0] for result in stateResults]
        return statuses

    def selectRollingWindow(self, projectID):
        '''
        rtype:  int
        return: number of rolling window days
        '''
        selectRollingWindowQuery = "SELECT rolling_time_window_days FROM team_project WHERE id = %s"
        self.cur.execute(selectRollingWindowQuery, (projectID,))
        result = self.cur.fetchone()
        return result[0]

    def fetch_teams(self):
        query = "SELECT * FROM team"
        self.cur.execute(query)
        self.conn.commit()
        return self.cur.fetchall()

    def fetch_team_by_name(self, team_name):
        query = "SELECT * FROM team WHERE name = %s"
        self.cur.execute(query, (team_name,))
        self.conn.commit()
        return self.cur.fetchall()

    def getTeamId(self, teamName):
        '''
        rtype: int
        return: team id
        '''
        getTeamId = "SELECT id FROM team WHERE name = %s"
        self.cur.execute(getTeamId, (teamName,))
        result = self.cur.fetchone()
        return result[0]

    def get_team_by_id(self, team_id):
        select_team_id_query = "SELECT name, id FROM team WHERE id = %s"
        self.cur.execute(select_team_id_query, (team_id,))
        return self.cur.fetchall()

    def get_team_from_project(self, team_id, project_name = None):
        base_query = "SELECT name, id FROM team_project WHERE team_project.team_id = %s"
        if project_name is not None:
            query = base_query + " AND name = %s"
            self.cur.execute(query, (team_id, project_name))
        else:
            self.cur.execute(base_query, (team_id,))

        self.conn.commit()
        return self.cur.fetchall()

    def getProjectId(self, projectName):
        '''
        rtype:  int
        return: project id
        '''
        getProjectId = "SELECT id FROM team_project WHERE name = %s"
        self.cur.execute(getProjectId, (projectName,))
        result = self.cur.fetchone()
        return result[0]

    def getBoardId(self, projectID):
        '''
        rtype: int
        return: board id
        '''
        getBoardId = "SELECT board_id FROM team_project WHERE id = %s"
        self.cur.execute(getBoardId, (projectID,))
        result = self.cur.fetchone()
        return result[0]

    def getRepos(self, projectID):
        '''
        rtype:  list[str]
        return: repository names that belongs to the project
        '''
        getReposQuery = "SELECT repo_name FROM team_repo WHERE team_project_id = %s"
        self.cur.execute(getReposQuery, (projectID,))
        results = self.cur.fetchall()
        return [result[0] for result in results]

    def getMergedPrCount(self, projectID, repoNames, dateSince, dateUntil):
        '''
        rtype:  list [(pr_count(int), week(datetime))]
        return: total pull request count per corresponding week
        '''
        prCountQuery = """
        SELECT COUNT(pr.pr_number) AS count,
               DATE_TRUNC('week', pr.merged_at) AS week
        FROM pull_requests pr
        JOIN team_repo tr ON (pr.repo=tr.repo_name)
        WHERE tr.team_project_id=(%s)
        AND pr.merged_at BETWEEN (%s) AND (%s)
        AND pr.repo IN %s
        GROUP BY DATE_TRUNC('week', pr.merged_at)
        ORDER BY DATE_TRUNC('week', pr.merged_at)
        """
        try:
            self.cur.execute(prCountQuery, (projectID, dateSince, dateUntil, tuple(repoNames),))
            result = self.cur.fetchall()
        except Exception as e:
            self.closeConnection()
            raise e
        return result

    def getIssueConfiguration(self, projectID):
        '''
        rtype: list [(board_name(str), board_id(int), rolling_time_window_days(int), issue_filter(str),
                      last_issue_change(int), include_subtasks(bool), excluded_issue_types(str))]
        return: requested column values from team_project with matching project id
        '''
        issueConfigQuery = """
        SELECT board_name, board_id, rolling_time_window_days, issue_filter,
        last_issue_change, include_subtasks, excluded_issue_types
        FROM team_project tp
        WHERE id = %s
        """
        self.cur.execute(issueConfigQuery, (projectID,))
        result = self.cur.fetchall()
        return result

    def getLeadTimeStartState(self, projectID):
        '''
        rtype: str
        return: default lead time start state
        '''
        leadTimeStartStateQuery = "SELECT default_lead_time_start_state FROM team_project WHERE id = %s"
        self.cur.execute(leadTimeStartStateQuery, (projectID,))
        result = self.cur.fetchone()
        return result[0]

    def getLeadTimeEndState(self, projectID):
        '''
        rtype: str
        return: default lead time end state
        '''
        leadTimeEndStateQuery = "SELECT default_lead_time_end_state FROM team_project WHERE id = %s"
        self.cur.execute(leadTimeEndStateQuery, (projectID,))
        result = self.cur.fetchone()
        return result[0]

    def getWorkStates(self, projectID):
        '''
        rtype: list[(state_name(str)]
        return: list of state names and its sequence
        '''
        workStatesQuery = """
        SELECT state_name
        FROM team_work_states
        WHERE team_project_id = %s
        ORDER BY seq_number
        """
        try:
            self.cur.execute(workStatesQuery, (projectID,))
            result = self.cur.fetchall()
        except Exception as e:
            self.closeConnection()
            raise e
        return result

    def get_merged_pull_requests_timestamp(self, project_id, repo_names, date_since, date_until):
        pull_requests_lead_time_query = """
        SELECT pr.created_at, pr.merged_at
        FROM pull_requests pr
        JOIN team_repo tr ON (pr.repo=tr.repo_name)
        WHERE tr.team_project_id = (%s)
        AND pr.created_at BETWEEN (%s) AND (%s)
        AND pr.merged_at BETWEEN (%s) AND (%s)
        AND repo IN %s
        ORDER BY merged_at
        """
        try:
            self.cur.execute(pull_requests_lead_time_query,
                             (project_id, date_since, date_until, date_since, date_until, tuple(repo_names),))
            result = self.cur.fetchall()
        except Exception as e:
            self.closeConnection()
            raise e
        return result

    def get_failed_pull_requests_volume(self, project_id, repo_names, date_since, date_until):
        failed_volume_query = """
        SELECT pr.pr_number, pr.created_at, pr.closed_at, (pr.lines_added + pr.lines_deleted) AS volume,
        (pr.merged_at IS NOT NULL) AS completed FROM pull_requests pr
        JOIN team_repo tr ON (pr.repo=tr.repo_name)
        WHERE tr.team_project_id = (%s)
        AND closed_at IS NOT NULL
        AND created_at < %s
        AND closed_at > %s
        AND repo IN %s
        ORDER BY created_at
        """
        try:
            self.cur.execute(failed_volume_query,
                             (project_id, date_until, date_since, tuple(repo_names)))
            result = self.cur.fetchall()
        except Exception as e:
            self.closeConnection()
            raise e
        return result

    def get_issue_types(self, project_id):
        issue_type_query = "SELECT issue_type, subtask FROM team_jira_issue_types WHERE team_project_id = %s"
        try:
            self.cur.execute(issue_type_query, (project_id,))
            results = self.cur.fetchall()
        except Exception as e:
            self.closeConnection()
            raise e
        return results

    def get_team_config_from_project(self, team_id):
        TEAM_CONFIG_COLUMNS = ["id", "name", "issue_filter", "last_issue_change"]
        get_team_config_query = "SELECT {} FROM team_project WHERE id = %s".format(','.join(TEAM_CONFIG_COLUMNS))

        with self.conn:
            with self.conn.cursor() as cur:
                cur.execute(get_team_config_query, (team_id,))
                result = cur.fetchone()
                return {
                    TEAM_CONFIG_COLUMNS[0]: result[0],  # id
                    TEAM_CONFIG_COLUMNS[1]: result[1],  # name
                    TEAM_CONFIG_COLUMNS[2]: result[2],  # issue_filter
                    TEAM_CONFIG_COLUMNS[3]: result[3]   # last_issue_change
                }

    def update_last_etl(self, team_config):
        get_last_etl_query = "SELECT last_etl_run FROM team_project_etl WHERE team_project_id = %s"
        update_start_time = time.time()

        with self.conn:
            with self.conn.cursor() as cur:
                cur.execute(get_last_etl_query, (team_config.get("id"),))
                result = cur.fetchone()

        with self.conn:
            with self.conn.cursor() as cur:
                if result is None:
                    update_last_etl_run_query = "INSERT INTO team_project_etl (last_etl_run, team_project_id) VALUES (%s, %s)"
                elif (not result[0]) or (update_start_time - result[0] > 300):
                    update_last_etl_run_query = "UPDATE team_project_etl SET last_etl_run = %s WHERE team_project_id = %s"
                else:
                    print("ERROR: ETL for project {} is already running at time {}".format(
                        team_config.get("name"), result[0]
                    ))
                    return

                cur.execute(update_last_etl_run_query, (int(update_start_time), team_config.get("id")))
                return {
                    "update_start_time": update_start_time
                }

    def reset_last_etl(self, team_id):
        with self.conn:
            with self.conn.cursor() as cur:
                resetLastETLRunQuery = "UPDATE team_project_etl SET last_etl_run = NULL WHERE team_project_id = %s"
                cur.execute(resetLastETLRunQuery, (team_id,))

    def update_last_issue_change_from_s3(self, s3_bucket, s3_file_name, last_issue_change, team_id):
        transactionQuery = "BEGIN TRANSACTION;" \
                           "COPY issue_change from 's3://" + s3_bucket + "/" + s3_file_name + \
                           "' credentials 'aws_iam_role=arn:aws:iam::" + common_constants.AWS_ACCOUNT_ID + ":role/vger-python-lambda" + \
                           "' dateformat 'auto' timeformat 'auto' csv;" \
                           "UPDATE team_project SET last_issue_change='{}' WHERE id={};" \
                           "END TRANSACTION;".format(last_issue_change, team_id)
        self.cur.execute(transactionQuery)
        self.conn.commit()

    def update_last_issue_change_from_csv(self, csv_path, last_issue_change, team_id):
        local_csv_file = open(csv_path, 'r')
        self.cur.copy_from(file=local_csv_file, table='issue_change', sep=',', columns=('team_project_id',
                                                                                        'changed',
                                                                                        'issue_key',
                                                                                        'field_name',
                                                                                        'prev_value',
                                                                                        'new_value',
                                                                                        'issue_type',
                                                                                        'resolution',
                                                                                        'subtask'))
        local_csv_file.close()
        transactionQuery = "UPDATE team_project SET last_issue_change='{}' WHERE id={};".format(last_issue_change, team_id)
        self.cur.execute(transactionQuery)
        self.conn.commit()
