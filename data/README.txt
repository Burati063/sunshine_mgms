Place your patient Excel file here as: patients.xlsx

Expected columns (header names are flexible):
  card number | date | fname | lname | age | gender | phonenumber

- card number: 1 ... 3800 (plain numbers)
- date: Ethiopian registration date, dd/mm/yyyy (e.g. 05/01/2010)
- gender: M / F / Male / Female

Run `npm run make:template` to generate a sample patients-template.xlsx,
then `npm run import:patients` to import (add -- --dry to validate first).

Real patient files in this folder are git-ignored.
