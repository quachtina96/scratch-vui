'''
This python script is a utility for easily debugging flows in scratch-vui.

Usage:
	-r Given a text file containing the test scenario, run the commands and log the output
	-p Given a text file containing the test scenario, print the commands to copy paste into the JS/Browser console
'''
import argparse
import os

def get_utterance(line):
	# cut out the beginning part of the log
	return line[line.find('utterance: ') + 11:]

def extract_commands(log_filepath):
	utterances = []
	with open(log_filepath,'r') as f:
		lines = f.read().split('\n')
		utterance_lines = list(filter(lambda line: " utterance: " in line, lines))
		utterances = list(map(lambda line: get_utterance(line), utterance_lines))
	return utterances

def get_js_console_commands(command_list):
	return list(map(lambda command: 'scratch.handleUtterance("' + command + '")', command_list))

def print_js_console_commands_to_print(command_list):
	jsconsoles = get_js_console_commands(command_list)
	print('\n'.join(jsconsoles))

def example():
	fixtures_dir = '/Users/quacht/Documents/M.Eng/VUI/Code/scratch-vui/test/fixtures'
	filename = 'scratch-vui-feb-12.log'
	filepath = os.path.join(fixtures_dir, filename)
	commands = extract_commands(filepath)
	jsconsoles = get_js_console_commands(commands)

def main():
	parser = argparse.ArgumentParser(description='Debug is a utility for easily debugging flows in scratch-vui.')
	parser.add_argument('-r',
	                    help='run the commands and log the output')
	parser.add_argument('-p',
	                    help='print the commands to copy paste into the JS/Browser console')

	args = vars(parser.parse_args())

	if (args['p']):
		filepath = args['p']
		commands = extract_commands(filepath)
		print_js_console_commands_to_print(commands)

	if (args['r']):
		print('run')

main()