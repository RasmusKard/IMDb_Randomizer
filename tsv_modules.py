import pandas as pd
import os


class TsvFile:
    """
    Class for converting raw IMDb .tsv files into sorted .tsv files by data type. (movie, tv show, etc.)
    """
    def __init__(self, title_file, ratings_file):
        self.title_file = title_file
        self.ratings_file = ratings_file

    def tsv_title_cleanup(self):
        """
        Removes unnecessary tvEpisode, isAdult and endYear data from tsv.
        """
        df = pd.read_table(self.title_file, sep='\t')

        df = df[df["titleType"] != "tvEpisode"]

        df = df[df["isAdult"] != 1]

        df = df.drop(['isAdult', 'endYear'], axis=1)

        df.to_csv(f'filtered_{self.title_file}', sep='\t', index=False)

    def tsv_merge(self):
        """
        Merges rating data .tsv and title data .tsv based on matching 'tconst' title identifiers.
        Deletes file generated by tsv_title_cleanup as it is no longer used.
        """

        data1 = pd.read_table(f'filtered_{self.title_file}', sep='\t')
        data2 = pd.read_csv(f'{self.ratings_file}', sep='\t')

        data_merged = pd.merge(data1, data2,
                               on='tconst',
                               how='inner')
        data_merged.to_csv('title_ratings_merged.tsv', sep="\t", index=False)
        try:
            os.remove(f'filtered_{self.title_file}')
        except OSError:
            pass

def tsv_file_delete():
    titletypes = ["movie", "tvSeries", "tvMovie", "tvSpecial", "video", "short", "tvShort"]
    for titletype in titletypes:
        try:
            os.remove(f'{titletype}_data.tsv')
        except OSError:
            pass
def titletype_split():
    """
    Splits file generated by tsv_merge into files based on content type. (movie, tv show, etc.)
    Deletes file generated by tsv_merge as it is no longer used.
    """
    titletypes = ["movie", "tvSeries", "tvMovie", "tvSpecial", "video", "short", "tvShort"]
    for titletype in titletypes:
        df = pd.read_table('title_ratings_merged.tsv', sep='\t')
        df = df[df["titleType"] == f"{titletype}"]
        df.to_csv(f'{titletype}_data.tsv', sep="\t", index=False)
    try:
        os.remove('title_ratings_merged.tsv')
    except OSError:
        pass
