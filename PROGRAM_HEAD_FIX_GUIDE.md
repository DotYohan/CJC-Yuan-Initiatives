# Program Head Assignment Fix Guide

## The Issue
The Program Head account you created is not linked to a program in the database, so the curriculum list cannot be displayed.

## Required Setup

Your project requires a PostgreSQL database connection. Create a `.env` file in your project root with:

```
DATABASE_URL=postgresql://username:password@localhost:5432/cor_jesu_sms
```

Replace:
- `username` - your PostgreSQL user
- `password` - your PostgreSQL password
- `localhost` - your database server (or IP)
- `5432` - your PostgreSQL port (default is 5432)
- `cor_jesu_sms` - your database name

## Steps to Fix

### 1. Create .env file
Create a file named `.env` in your project root with the DATABASE_URL above.

### 2. Run diagnostic (dry-run)
```bash
npm run repair:program-head:dry
```

This will scan your database and show which Program Head accounts are missing assignments, WITHOUT making any changes.

### 3. Apply the fix
```bash
npm run repair:program-head
```

This will automatically assign Program Head accounts to their matching programs.

## What the Fix Does

The repair script:
1. Finds all Program Head accounts that don't have a program assignment
2. Attempts to match them to programs based on name/code (e.g., "ECE" → ECE program)
3. Creates the missing `user_program_assignments` records
4. Enables the Program Head workspace and curriculum list to work correctly

## After the Fix

Once repaired:
- Log out and log back in
- Your Program Head account should now show the program name in the header
- Your created curricula should appear in the list

## If Auto-Matching Fails

If the script cannot automatically match your Program Head to a program, you'll need to manually assign them via the admin interface:

1. Go to admin panel → Users
2. Select the Program Head account
3. Click "Assign Program" and select the appropriate program
4. Save

---

For questions about database setup, contact your system administrator.
