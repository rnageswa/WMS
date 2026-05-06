import os

# Read the file
with open('lib/api-spec/openapi.yaml', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where the incorrectly appended schemas start (line with '  SalesOrder:' at 2-space indent)
start_idx = None
for i, line in enumerate(lines):
    if line.strip() == 'SalesOrder:':
        # Check if it's at 2-space indent (wrong place)
        if line.startswith('  ') and not line.startswith('    '):
            start_idx = i
            break

if start_idx is None:
    print('ERROR: Could not find misplaced schemas')
    exit(1)

print(f'Found misplaced schemas at line {start_idx + 1}')

# Extract the misplaced schemas (from start_idx to end)
misplaced = lines[start_idx:]
# Fix indentation: add 2 more spaces to each line that has content
fixed = []
for line in misplaced:
    if line.strip():  # non-empty line
        fixed.append('  ' + line)  # Add 2 more spaces
    else:
        fixed.append(line)

# Remove the misplaced content from the file
lines = lines[:start_idx]

# Find where to insert the fixed schemas (inside components:schemas section)
# Look for the last schema definition (like '  SomeSchema:' with 4 spaces)
insert_idx = None
for i in range(len(lines) - 1, -1, -1):
    line = lines[i]
    # A schema definition line has 4 spaces then a word then colon
    if line.startswith('    ') and line.strip().endswith(':') and not line.strip().startswith('-'):
        # Check it's not a property but a schema name
        stripped = line.strip()
        if stripped not in ['type:', 'properties:', 'items:', 'required:', 'enum:', 'format:', 'description:', 'nullable:', 'minimum:', 'maximum:', 'minItems:', 'maxItems:', 'pattern:']:
            insert_idx = i + 1
            break

if insert_idx is None:
    print('ERROR: Could not find insertion point')
    exit(1)

print(f'Inserting schemas at line {insert_idx + 1}')

# Insert the fixed schemas
new_lines = lines[:insert_idx] + ['\n'] + fixed + ['\n'] + lines[insert_idx:]

# Write back
with open('lib/api-spec/openapi.yaml', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('SUCCESS: Schemas properly placed inside components:schemas:')
