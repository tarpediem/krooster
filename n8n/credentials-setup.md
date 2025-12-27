# n8n Credentials Setup

## PostgreSQL Connection

After importing the workflows, you need to create the PostgreSQL credential in n8n.

### Steps:

1. Go to **Settings** > **Credentials** > **Add Credential**
2. Select **PostgreSQL**
3. Configure with the following values:

| Field | Value |
|-------|-------|
| Credential Name | `PostgreSQL Planning` |
| Host | `planning-postgres` (or `postgres` if using docker-compose) |
| Database | `planning` |
| User | `planning` |
| Password | Use `{{$env.POSTGRES_PASSWORD}}` or your actual password |
| Port | `5432` |
| SSL | Disable (for internal network) |

### Important Notes:

- The credential ID must match `postgres-planning` as referenced in the workflows
- If using a different credential ID, you'll need to update all workflow files
- For production, ensure SSL is enabled and proper network isolation is configured

## Environment Variables

Set these environment variables in your n8n container:

```yaml
environment:
  - POSTGRES_PASSWORD=your_secure_password
```

## Workflow Import

To import workflows:

1. Go to n8n dashboard
2. Click on **...** menu > **Import from File**
3. Select each JSON file from the `workflows/` directory:
   - `crud-employees.json`
   - `crud-shifts.json`
   - `leave-requests.json`

4. After import, activate each workflow by toggling the switch

## API Endpoints Created

Once active, these endpoints will be available:

### Employees
- `POST /webhook/api/employees` - Create employee
- `GET /webhook/api/employees` - List employees
- `PUT /webhook/api/employees/:id` - Update employee
- `DELETE /webhook/api/employees/:id` - Soft delete employee

### Shifts
- `POST /webhook/api/shifts` - Create shift (with conflict check)
- `GET /webhook/api/shifts?date=YYYY-MM-DD` - List shifts
- `PUT /webhook/api/shifts/:id` - Update shift
- `DELETE /webhook/api/shifts/:id` - Cancel shift

### Leave Requests
- `POST /webhook/api/leave` - Request leave
- `GET /webhook/api/leave` - List leave requests
- `PUT /webhook/api/leave/:id/approve` - Approve leave
- `PUT /webhook/api/leave/:id/reject` - Reject leave
- `GET /webhook/api/leave/balance/:employee_id` - Get leave balance
