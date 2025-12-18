# BIAR CouchDB Setup

Simple Docker Compose setup for CouchDB.

## Quick Start

1. **Start CouchDB**:

   ```bash
   docker-compose up -d
   ```

2. **Stop CouchDB**:

   ```bash
   docker-compose down
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f
   ```

## Access

- **Web Interface**: http://localhost:5984/\_utils
- **API**: http://localhost:5984
- **Username**: admin
- **Password**: password

## Configuration

Edit the `.env` file to change:

- `COUCHDB_USER`: Admin username
- `COUCHDB_PASSWORD`: Admin password
- `COUCHDB_PORT`: Port to expose CouchDB

## Data

Data persists in Docker volumes. To remove all data:

```bash
docker-compose down -v
```
