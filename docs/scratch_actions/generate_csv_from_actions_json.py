import json
import csv
import os

current_directory = os.getcwd()
json_dir = os.path.join(current_directory,'json')
csv_dir = os.path.join(current_directory,'csv')
for filename in os.listdir(json_dir):
	if filename.endswith(".json"):
		action_type = os.path.splitext(filename)[0]
		path_to_json = os.path.join(json_dir, filename)

		with open(path_to_json, "r") as f:
			actions_string = f.read()
			actions = json.loads(actions_string)


			# open a file for writing
			actions_csv = open(os.path.join(csv_dir,action_type + '.csv'), 'w+')

			# create the csv writer object
			csvwriter = csv.writer(actions_csv)
			count = 0

			header = ["name", "description", "idealTrigger"]
			for actionName in actions.keys():
				action = actions[actionName]
				if count == 0:
					csvwriter.writerow(header)
					count += 1
				csvwriter.writerow([action['name'], action['description'], action['idealTrigger']])
			actions_csv.close