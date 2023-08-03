from flask import Flask, render_template, session
from flask_modules import get_sorted_data, get_poster_url
from decimal import Decimal, getcontext
import secrets
from flask_session import Session
from datetime import timedelta

app = Flask(__name__)
app.secret_key = secrets.token_urlsafe(16)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=15)

Session(app)




# Render the main HTML page
@app.route("/")
def index():
    return render_template("index.html")



def get_template_variables():
    sorted_data = get_sorted_data()
    row_count = len(sorted_data.index)

    getcontext().prec = 3
    probability = Decimal('100') / Decimal(f'{row_count}')

    row_count = '{:,}'.format(row_count)

    return sorted_data, row_count, probability


@app.route('/run_script', methods=['POST'])
def run_script():
    sorted_data = get_sorted_data()
    row_count = len(sorted_data.index)

    if row_count == 0:
        # If the sorted data is empty, return an error
        error_message = "Error: No results found, please widen search parameters."
        return render_template("index.html", error_message=error_message), 400

    randomized_data = sorted_data.sample()
    poster_url, overview = get_poster_url(randomized_data['tconst'].values[0])

    getcontext().prec = 3
    probability = Decimal('100') / Decimal(f'{row_count}')

    # Thousand separators
    row_count_formatted = '{:,}'.format(row_count)

    # Store the sorted_data, row_count, and probability in the session
    session['sorted_data'] = sorted_data
    session['row_count'] = row_count_formatted
    session['probability'] = probability

    return render_template("randomized_content.html", sorted_data=randomized_data, poster_url=poster_url,
                           overview=overview, row_count=row_count_formatted, probability=probability)


@app.route('/reroll', methods=['POST'])
def reroll():
    # Get the stored data from the session
    sorted_data = session.get('sorted_data')
    try:
        print(sorted_data.head())
    except AttributeError:
        error_message = "Your session has timed out, please try again."
        return render_template('index.html', error_message=error_message)
    except NameError:
        error_message = "Your session has timed out, please try again."
        return render_template('index.html', error_message=error_message)
    row_count_formatted = session.get('row_count', '')
    probability = session.get('probability', Decimal('0.0'))

    randomized_data = sorted_data.sample()
    poster_url, overview = get_poster_url(randomized_data['tconst'].values[0])

    return render_template("randomized_content.html", sorted_data=randomized_data, poster_url=poster_url,
                           overview=overview, row_count=row_count_formatted, probability=probability)



if __name__ == "__main__":
    app.run()
