# Restaurant Schedule Planner - User Guide

## Welcome!

This guide will help you manage your restaurant schedules easily. No computer experience needed!

---

# Table of Contents

1. [Getting Started](#1-getting-started)
2. [Managing Employees](#2-managing-employees)
3. [Creating Shifts](#3-creating-shifts)
4. [Managing Leave Requests](#4-managing-leave-requests)
5. [Using the AI Assistant](#5-using-the-ai-assistant)
6. [Common Problems & Solutions](#6-common-problems--solutions)

---

# 1. Getting Started

## How to Access the System

You need two websites to manage your restaurants:

| What it does | Website Address |
|-------------|-----------------|
| View and edit data (employees, shifts) | `http://your-server:8080` |
| Run automations and AI | `http://your-server:5678` |

> **TIP:** Ask your IT person for the exact website addresses. Bookmark them in your browser!

---

## First-Time Login

### Step 1: Open your web browser

Click on Chrome, Firefox, or Safari on your computer.

![Screenshot placeholder: Show a web browser icon on a computer desktop]

### Step 2: Type the website address

Type `http://your-server:8080` in the address bar at the top.

![Screenshot placeholder: Show browser with address bar highlighted, arrow pointing to where to type]

### Step 3: Enter your username and password

You will see a login screen.

1. Type your **email** in the first box
2. Type your **password** in the second box
3. Click the big **"Sign In"** button

![Screenshot placeholder: Login page with two input fields (email, password) and a Sign In button. Arrows pointing to each field with numbers 1, 2, 3]

### Step 4: You're in!

You should now see the main dashboard with your restaurant data.

![Screenshot placeholder: Main dashboard showing tables like "Employees", "Shifts", "Restaurants" in a list on the left side]

---

# 2. Managing Employees

## How to View All Employees

### Step 1: Click on "Employees" table

On the left side of your screen, you will see a list of tables. Click on **"employees"**.

![Screenshot placeholder: Left sidebar with table names, arrow pointing to "employees" table]

### Step 2: See your employee list

You will see a table with all your employees. Each row is one person.

![Screenshot placeholder: Table view showing employee names, phone numbers, restaurant assignments in rows and columns]

> **TIP:** You can scroll down to see more employees!

---

## How to Add a New Employee

### Step 1: Click the "+" button

Look for a **plus sign (+)** button. It's usually at the bottom of the table or in the top menu.

![Screenshot placeholder: Table view with a big arrow pointing to the + button to add new row]

### Step 2: Fill in the information

A new empty row will appear. Fill in each box:

| Field | What to type | Example |
|-------|--------------|---------|
| **nom** | Last name | Dupont |
| **prenom** | First name | Marie |
| **telephone** | Phone number | 0812345678 |
| **email** | Email address | marie@email.com |
| **restaurant_id** | Which restaurant? Type 1 for Hua Hin, 2 for Sathorn | 1 |
| **est_mobile** | Can work at both places? Check the box for YES | Check or uncheck |
| **postes** | What jobs can they do? Type: cuisine, service, bar, plonge, caisse | service, bar |
| **actif** | Are they currently working? Check for YES | Check |
| **date_embauche** | When did they start? | 2024-01-15 |

![Screenshot placeholder: New row being filled in with arrows pointing to each field and example values typed in]

### Step 3: Click somewhere else to save

Just click outside the row. Your data is saved automatically!

![Screenshot placeholder: Show the row now saved, maybe with a small checkmark or different color]

---

## How to Edit an Employee

### Step 1: Find the employee

Scroll through the list or use the search box at the top.

![Screenshot placeholder: Search box with "Marie" typed in, showing filtered results]

### Step 2: Click on the information you want to change

Click directly on the box you want to edit. For example, click on the phone number.

![Screenshot placeholder: Cursor clicking on a phone number cell]

### Step 3: Type the new information

Delete the old text and type the new text.

![Screenshot placeholder: Cell being edited with new phone number]

### Step 4: Click somewhere else to save

Done! The change is saved.

---

## How to Mark Someone as "Mobile"

Mobile employees can work at BOTH restaurants (Hua Hin AND Sathorn).

### Step 1: Find the employee in the list

### Step 2: Look for the "est_mobile" column

This column has checkboxes.

### Step 3: Click the checkbox

- **Checked** = This person CAN work at both restaurants
- **Unchecked** = This person only works at their home restaurant

![Screenshot placeholder: est_mobile column with some checkboxes checked and some unchecked, with labels explaining each]

> **REMEMBER:** Mobile employees get housing when they travel to the other restaurant!

---

# 3. Creating Shifts

## How to View the Weekly Schedule

### Step 1: Click on "shifts" table

On the left side, click **"shifts"**.

![Screenshot placeholder: Left sidebar with arrow pointing to "shifts" table]

### Step 2: See all shifts

You will see a table with all scheduled work shifts.

![Screenshot placeholder: Shifts table showing dates, employee names, times, restaurants]

### Step 3: Filter by date (optional)

To see only this week's shifts:

1. Click on the **"date"** column header
2. Click **"Filter"**
3. Choose **"is within"** and select **"This week"**

![Screenshot placeholder: Filter menu open on date column with options visible]

---

## How to Add a Shift for an Employee

### Step 1: Click the "+" button

Add a new row to the shifts table.

![Screenshot placeholder: Plus button in shifts table]

### Step 2: Fill in the shift details

| Field | What to type | Example |
|-------|--------------|---------|
| **employee_id** | The employee's number (find it in employees table) | 5 |
| **restaurant_id** | Which restaurant? 1 = Hua Hin, 2 = Sathorn | 1 |
| **date** | The day of the shift | 2024-02-15 |
| **heure_debut** | Start time | 10:00 |
| **heure_fin** | End time | 18:00 |
| **pause_debut** | When is lunch break? | 13:00 |
| **pause_duree** | How long is the break? (minutes) | 30 |
| **poste** | What job? (cuisine, service, bar, plonge, caisse) | service |
| **est_mission** | Is this person traveling from another restaurant? | Check if yes |
| **statut** | Status of the shift | planifie |
| **notes** | Any extra information | Birthday party at 7pm |

![Screenshot placeholder: New shift row being filled in with example data]

### Step 3: Click outside to save

Your shift is now scheduled!

---

## Understanding Shift Status

Each shift has a status. Here's what they mean:

| Status | What it means | Color |
|--------|---------------|-------|
| **planifie** | Planned, but not yet confirmed | Yellow |
| **confirme** | The employee has confirmed they will come | Green |
| **annule** | Cancelled - shift won't happen | Red |

![Screenshot placeholder: Three shifts showing different statuses with their colors]

> **TIP:** Always confirm shifts with your employees before changing status to "confirme"!

---

# 4. Managing Leave Requests

## How to View Leave Requests

### Step 1: Click on "absences" table

On the left side, click **"absences"**.

![Screenshot placeholder: Left sidebar with arrow pointing to "absences" table]

### Step 2: See all leave requests

Each row is one leave request from an employee.

![Screenshot placeholder: Absences table showing employee names, dates, types, and statuses]

---

## How to Approve or Reject Leave

### Step 1: Find the request

Look for requests with status **"demande"** (pending).

![Screenshot placeholder: Absences table with a row highlighted that has status "demande"]

### Step 2: Check if you can approve

Before approving, check:
- Is there enough staff on those days?
- Does the employee have enough leave days?

### Step 3: Change the status

Click on the **"statut"** box and change it to:
- **"approuve"** = YES, they can take leave
- **"refuse"** = NO, they cannot take leave

![Screenshot placeholder: Dropdown menu showing "approuve" and "refuse" options]

### Step 4: Add your name

Click on **"valide_par"** and type your name.

![Screenshot placeholder: valide_par field with "Manager Name" typed in]

---

## Checking Leave Balance

To see how many leave days an employee has:

### Step 1: Click on "solde_conges" table

![Screenshot placeholder: Left sidebar with arrow pointing to "solde_conges" table]

### Step 2: Find the employee

Look for their name or employee_id.

### Step 3: Check their balance

| Column | What it means |
|--------|---------------|
| **jours_acquis** | Days they have earned |
| **jours_pris** | Days they have already used |
| **Remaining** | jours_acquis - jours_pris = days left |

![Screenshot placeholder: solde_conges table with arrows explaining each column]

> **EXAMPLE:** If jours_acquis = 15 and jours_pris = 5, they have 10 days left!

---

# 5. Using the AI Assistant

The AI assistant can automatically create schedules and answer questions about your planning.

## How to Generate a Weekly Schedule Automatically

### Step 1: Open n8n

Go to `http://your-server:5678` in your browser.

![Screenshot placeholder: n8n login page]

### Step 2: Find the "Generate Schedule" workflow

Click on **"Workflows"** in the menu, then find **"generation-planning"**.

![Screenshot placeholder: n8n workflow list with "generation-planning" highlighted]

### Step 3: Click "Execute Workflow"

Click the big **"Execute Workflow"** button (usually orange or green).

![Screenshot placeholder: n8n workflow with Execute button highlighted]

### Step 4: Wait for the AI

**Be patient!** The AI needs 30-60 seconds to think about the best schedule.

![Screenshot placeholder: Loading indicator or progress message]

### Step 5: Check the results

Go back to NocoDB and look at the shifts table. New shifts should appear!

![Screenshot placeholder: Shifts table with new AI-generated shifts highlighted]

---

## How to Ask Questions About the Schedule

### Step 1: Open n8n

Go to `http://your-server:5678`

### Step 2: Find the "AI Question" workflow

Look for **"ia-question"** in the workflows.

### Step 3: Click "Execute with input"

You can type your question, for example:
- "Who is working this Saturday?"
- "Do we have enough staff for next week?"
- "Which mobile employees are available?"

![Screenshot placeholder: Text input box where user types their question]

### Step 4: Read the answer

The AI will give you an answer based on your current data.

![Screenshot placeholder: AI response showing answer to the question]

---

# 6. Common Problems & Solutions

## Problem: "I can't see my employees!"

**Cause:** You might have a filter on.

**Solution:**
1. Look for a **"Filter"** button or icon at the top of the table
2. Click **"Clear all filters"** or **"Remove filter"**
3. Now you should see all employees

![Screenshot placeholder: Filter button and "Clear all filters" option]

---

## Problem: "Shift won't save!"

**Cause:** There might be a conflict.

**Check these things:**

1. **Is the employee on leave that day?**
   - Check the absences table

2. **Is the employee already working that day?**
   - One person cannot be in two places at the same time!

3. **Is the shift too long?**
   - Maximum shift is 8 hours

**Solution:**
- Fix the conflict first
- Then try adding the shift again

![Screenshot placeholder: Error message when trying to save conflicting shift]

---

## Problem: "System is slow when using AI"

**Cause:** The AI is thinking! This is normal.

**Solution:**
- Wait 30-60 seconds
- Do NOT click multiple times
- If it takes more than 2 minutes, ask your IT person to check if the system is running

![Screenshot placeholder: Loading message saying "AI is generating schedule, please wait..."]

---

## Problem: "I made a mistake!"

**Cause:** You entered wrong information.

**Solution:**
1. Find the wrong information in the table
2. Click on it
3. Type the correct information
4. Click outside to save

> **TIP:** Changes are saved immediately. There is no "undo" button, so be careful!

---

## Problem: "I don't know which restaurant ID to use"

**Quick Reference:**

| Restaurant | ID Number |
|------------|-----------|
| Hua Hin | 1 |
| Sathorn | 2 |

![Screenshot placeholder: Simple graphic showing Hua Hin = 1, Sathorn = 2]

---

# Quick Reference Card

Print this page and keep it near your computer!

## Website Addresses
- **View/Edit Data:** `http://your-server:8080`
- **Run AI/Automations:** `http://your-server:5678`

## Restaurant IDs
- Hua Hin = **1**
- Sathorn = **2**

## Shift Status
- planifie = Planned
- confirme = Confirmed
- annule = Cancelled

## Leave Status
- demande = Waiting for approval
- approuve = Approved
- refuse = Rejected

## Need Help?
Contact your IT support person!

---

# End of User Guide

**Last updated:** December 2024

**Version:** 1.0
