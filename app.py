from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/plan')
def get_plan():
    # TODO: implement training plan logic
    return {'plan': 'coming soon'}

if __name__ == '__main__':
    app.run(debug=True)
