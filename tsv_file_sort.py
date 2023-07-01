import tsvfile

# Download data files from here: https://developer.imdb.com/non-commercial-datasets/
# Extract and move .tsv files into the same folder as this file.
# Insert .tsv file names below.
files = tsvfile.TsvFile(title_file='title_data.tsv', ratings_file='ratings_data.tsv')

# Removes unnecessary tvEpisode, isAdult and endYear data from tsv.
files.tsv_title_cleanup()

# Merges rating data .tsv and title data .tsv based on matching 'tconst' title identifiers.
# Deletes file generated by tsv_title_cleanup as it is no longer used.
files.tsv_merge()

# Splits file generated by tsv_merge into files based on content type. (movie, tv show, etc.)
# Deletes file generated by tsv_merge as it is no longer used.
tsvfile.titletype_split()
