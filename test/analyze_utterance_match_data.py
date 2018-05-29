"""
Given a path to the output of test_utterance_match.js's experiment function,
processes and plots the data to give a better understanding of how the
jarowinkler and levenshtein  distances compare in determining what may be a
good match.
"""
from matplotlib.ticker import FuncFormatter
import matplotlib.pyplot as plt
import numpy as np

class Mismatch:
	def __init__(self, target, utterance, jaroWinklerDistance, levenshteinDistance):
		self.target = target
		self.utterance = utterance
		self.jaroWinklerDistance = jaroWinklerDistance
		self.levenshteinDistance = levenshteinDistance


with open('test_utterance_match_data.txt') as f:
	data = f.read()
lines = data.split('\n')
mismatches = []
chunkSize = 6
for i in xrange(0, len(lines), chunkSize):
	chunk = lines[i:i+chunkSize]
	if len(chunk) == 6:
		mismatches.append(Mismatch(chunk[0], chunk[1], chunk[3], chunk[5]))

utteranceInfo = {}
for mismatch in mismatches:
	if mismatch.utterance in utteranceInfo:
		utteranceInfo[mismatch.utterance].append(mismatch)
	else:
		utteranceInfo[mismatch.utterance] = [mismatch]

for utterance, mismatchList in utteranceInfo.items():
	plt.close()
	x = np.arange(len(mismatchList))
	# dist = [round(float(mismatch.jaroWinklerDistance),2) for mismatch in mismatchList]

	dist = [round(float(mismatch.levenshteinDistance),2) for mismatch in mismatchList]

	fig, ax = plt.subplots()
	ax.set_ylabel('Levenshtein Distance')

	plt.bar(x, dist)
	plt.xticks(x, [unicode(str(mismatch.target), errors='ignore') for mismatch in mismatchList])
	plt.xticks(rotation=90)
	# ax.set_ylabel('JaroWinkler Distance')
	ax.set_xlabel('target utterance')
	ax.set_title(utterance)
	plt.tight_layout()
	plt.show()

