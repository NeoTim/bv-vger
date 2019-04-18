# Local Sandbox
Vger sounds nice and all, but what if you'd like to see it working for yourself?
This document aims to present a means by which for you to deploy the service entirely locally.

## Things you will need
1. Be sure you've read through the [Hitchhiker's Guide to Vger](developer-guide.md). 
This will set you up with the tools necessary for Vger to operate both locally, and when deployed.

2. For `Node.js`, you need to `npm install http-server -g` in order to run UI locally.


## Oh Redshift...
By far, the largest hurdle of Vger at the moment is Redshift. We are working towards removing this as a strict dependency,
but in the meantime, there is a workaround for local testing! We are using [pgredshift](https://hub.docker.com/r/hearthsim/pgredshift)
from [HearthSim](https://github.com/HearthSim) to emulate [Amazon Redshift](https://aws.amazon.com/redshift/) in a local docker container.

* `docker pull hearthsim/pgredshift`

* `docker run -d --name test-redshift -p 5432 hearthsim/pgredshift`
    * TODO - Right now, the local configs are hardcoded. These should be configurable
        * docker container name
        * database name
        * database user
        * database password
        * database port
        
* Currently, I don't have a script that populates the database with the appropriate schema. This can be done manually by
establishing a connection to the database and running the [schema.sql](../source/database/schema.sql)
    * NOTE: Due to differences in Redshift and Postgres some syntax changes will need to be made.
        * `id INT IDENTITY(1,1)` -> `id INT GENERATED always as identity`