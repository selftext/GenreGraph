# pyItunes courtesy of https://github.com/liamks/pyitunes
from pyItunes import *
import re
 
pl = XMLLibraryParser("data/Library.xml")
l = Library(pl.dictionary)
 
genreSongTotals = {}
genrePlayTotals = {}
artists = {}
genreLinks = {}
nodes = {}
sharedArtists = {}

for song in l.songs:
	# skip meaningless genres and artists
	if (song.genre == None or song.genre == 'Unknown') or song.genre == 'Other': continue
	if song.album_artist == None and song.artist == None: continue
	if song.artist == 'Various Artists' or song.album_artist == 'Various Artists': continue

	genre = song.genre

	if song.album_artist != None:
		# album_artist is preferred because it provides better aggregation
		artist = song.album_artist
	else:
		artist = song.artist

	plays = song.play_count

	# clean ampersands
	genre = re.sub('&#38;','&',genre)
	artist = re.sub('&#38;','&',artist)

	# find total number of songs for each genre
	if genre not in genreSongTotals:
		genreSongTotals[genre] = 1
	else:
		genreSongTotals[genre] += 1

	# find total number of plays for each genre
	if plays != None:
		if genre not in genrePlayTotals:
			genrePlayTotals[genre] = plays
		else:
			genrePlayTotals[genre] += plays

	# create dictionary with artist as key and list of unique 
	# genres as value
	if artist not in artists:
		genreList = [genre]
		artists[artist] = genreList
	else:
		match = False
		for listedGenre in artists[artist]:
			if listedGenre == genre: match = True
		# add genre to artist list if no match found
		if match == False: artists[artist].append(genre)

# outer loop for artist list
for artist in artists:

	# inner loop for each artist's genre list
	gLst = artists[artist]
	index = 0

	while index < len(gLst):
		
		for genre in gLst:
			if gLst[index] != genre:
				# indicate link with line of dashes
				link = gLst[index] + '-----' + genre
				linkFlipped = genre + '-----' + gLst[index]
				# if no link has yet been established, create link as key and artist as value
				if link not in genreLinks and linkFlipped not in genreLinks:
					genreLinks[link] = [artist]
				# if link has been established, append the current artist to the list of artists if not
				#	 already there
				seen = False
				if linkFlipped in genreLinks:
					for i in genreLinks[linkFlipped]:
						if artist == i: seen = True
					if seen == False: genreLinks[linkFlipped].append(artist)
				if link in genreLinks:
					for i in genreLinks[link]:
						if artist == i: seen = True
					if seen == False: genreLinks[link].append(artist)

		index += 1

# loop through link dictionary pulling out individual genre names
# add genres to to a genre -> id dictionary and a genre -> shared artists dictionary
idCounter = 0
for glink in genreLinks:
	print glink, genreLinks[glink]
	g1, g2 = glink.split('-----')
	artistList = genreLinks[glink][:]

	if g1 not in nodes:
		nodes[g1] = idCounter
		idCounter += 1
		sharedArtists[g1] = artistList[:]
	else:
		sharedArtists[g1] += artistList[:]
	
	if g2 not in nodes:
		nodes[g2] = idCounter
		idCounter += 1
		sharedArtists[g2] = artistList[:]
	else:
		sharedArtists[g2] += artistList[:]

# create the JSON file
OUT = open('json.json', 'w')

# add nodes to the JSON file
OUT.write('{"nodes":[')

nodeCounter = 1

for node in nodes:
	#default values for null song and play totals
	songTotal = -1
	playTotal = -1

	if node in genreSongTotals:
		songTotal = genreSongTotals[node]
	if node in genrePlayTotals:
		playTotal = genrePlayTotals[node]

	OUT.write('{"genre":"' + node + '","id":' + str(nodes[node]))
	
	OUT.write(',"playcount":' + str(playTotal) + ',"songcount":' + str(songTotal))

	OUT.write(',"sharecount":' + str(len(set(sharedArtists[node]))))

	if nodeCounter == len(nodes): OUT.write('}')	# for last node
	else: OUT.write('},')

	nodeCounter += 1

OUT.write('],')

#add links to the JSON file
OUT.write('"links":[')

linkCounter = 1

for genreLink in genreLinks:
	artistCount = len(genreLinks[genreLink])
	g1, g2 = genreLink.split('-----')
	source = nodes[g1]
	target = nodes[g2]

	OUT.write('{"source":' + str(source) + ',"target":' + str(target) + ',')

	OUT.write('"artistcount":' + str(artistCount) + ',"artists":[')

	genreCounter = 1

	# shared artists
	for genreName in sorted(genreLinks[genreLink]):
		# for last artist in list
		if genreCounter == len(genreLinks[genreLink]):
			OUT.write('{"artist":"' + genreName + '"}')
		else:
			OUT.write('{"artist":"' + genreName + '"},')
		genreCounter += 1

	if linkCounter == len(genreLinks): OUT.write(']}')	# for last link
	else: OUT.write(']},')

	linkCounter += 1

OUT.write(']}')

OUT.close()