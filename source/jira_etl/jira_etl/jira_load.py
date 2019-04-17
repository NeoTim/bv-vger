from __future__ import print_function
import math
import os
import boto
from filechunkio import FileChunkIO

from source.jira_etl.constants import jira_etl_constants
from source.web_api.utils.redshift_connection.redshift_connection import RedshiftConnection


def jira_load(team_id, csv_path, last_issue_change):
    # Since the script is run on lambda, the only file we can write to is /tmp
    split_path = (csv_path.split('/'))
    file_name = split_path[-1]

    # Connect to S3 using boto
    s3 = boto.connect_s3()
    s3_bucket = s3.get_bucket(jira_etl_constants.S3_ENG_BUCKET)

    # Find out the size of the file to determine if chunking is needed
    source_size = os.stat(csv_path).st_size

    # Skip the repo if there isn't any extracted data
    if source_size != 0:
        print(csv_path + " starting load")
        print("Last Issue Change: {}".format(last_issue_change))
        # # Create a multipart upload request
        # multi_part_upload = s3_bucket.initiate_multipart_upload(os.path.basename(csv_path))
        #
        # # Use a chunk size of 50 MiB for large files which may exceed this
        # # sending the file and uploading in parts helps for large data files
        # # and for copying into Redshift
        # chunk_size = 52428800
        # chunk_count = int(math.ceil(source_size / float(chunk_size)))
        #
        # # Send the file parts, using FileChunkIO to create a file-like object
        # # that points to a certain byte range within the original file. We
        # # set bytes to never exceed the original file size.
        # for i in range(chunk_count):
        #     offset = chunk_size * i
        #     chunk_bytes = min(chunk_size, source_size - offset)
        #     with FileChunkIO(csv_path, 'r', offset=offset, bytes=chunk_bytes) as fp:
        #         multi_part_upload.upload_part_from_file(fp, part_num=i + 1)
        #
        # # Finish the upload
        # multi_part_upload.complete_upload()

        database = RedshiftConnection()
        # database.update_last_issue_change_from_s3(s3_bucket=jira_etl_constants.S3_ENG_BUCKET,
        #                                           s3_file_name=file_name,
        #                                           last_issue_change=last_issue_change,
        #                                           team_id=team_id)
        database.update_last_issue_change_from_csv(csv_path=csv_path,
                                                   last_issue_change=last_issue_change,
                                                   team_id=team_id)
        database.closeConnection()

        # Delete the file after uploading
        # s3_bucket.delete_key(file_name)
        print(file_name + " loaded")
    else:
        # If the file size is 0
        print("No data extracted. Nothing was loaded to Redshift")
