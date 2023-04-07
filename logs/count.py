import csv

p = [1, 5, 6, 8, 9, 10, 12, 13, 19, 21, 15, 20]
# p = [1]

# Define the phrase you want to search for
search_phrases = {
    "tti": 'fn=TTI ',
    "gpt_list": 'fn=GPT_LIST ',
    "list_completion": 'fn=LIST_COMPLETION ',
    "synonyms": 'fn=SYNONYMS ',
    "antonyms": 'fn=ANTONYMS ',
    "alternatives": 'fn=ALTERNATIVES ',
    "divergents": 'fn=DIVERGENTS ',
    "embellish": 'fn=EMBELLISH ',
    "gpt": 'fn=GPT ',
}

d = []

for i in p:
    # Open the file for reading
    with open(f'{i}-logs.txt', 'r') as file:
        # Read the contents of the file into a string variable
        file_contents = file.read()

    with open(f'{i}-logs-task.txt', 'r') as file:
        task_contents = file.read()

    count_fn = {"id": i}

    # Use the count() method to count the number of times the phrase appears in the file
    total = 0
    for k, v in search_phrases.items():
        count_fn[k] = file_contents.count(v)
        tc = task_contents.count(v)
        count_fn[k + " task"] = tc
        if k != 'tti':
            total += tc

    for k in search_phrases.keys():
        if k != 'tti':
            count_fn[k + " freq"] = count_fn[k + " task"] / total

    # Print the count
    print(f"{i} =============================")
    print(count_fn)

    d.append(count_fn)
    # print(f'The phrase "{search_phrase}" appears {count} times in the file.')

headers = list(count_fn.keys())

# Open the CSV file for writing
with open("count.csv", 'w', newline='') as file:
    # Create a CSV writer object
    writer = csv.DictWriter(file, fieldnames=headers)

    # Write the header row to the CSV file
    writer.writeheader()

    # Write the data rows to the CSV file
    for i in d:
        writer.writerow(i)

