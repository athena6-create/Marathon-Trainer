# Half Marathon Training Plan

A personalized training companion for preparing for a half marathon, built with injury awareness and real-time adaptation.

## Features (In Progress)
- Personalized training plan generation
- Real-time workout logging and plan adaptation
- Injury management (track constraints like rib injury)
- Strength training recommendations
- Work schedule integration

## Tech Stack
- **Backend**: Python + Flask
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **Hosting**: Railway/Render

## Getting Started

### Prerequisites
- Python 3.8+
- pip
- PostgreSQL (for production)

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/marathon-trainer.git
cd marathon-trainer
```

2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Run the app
```bash
python app.py
```

Visit `http://localhost:5000` in your browser.

## Development Notes
- Flask debug mode is enabled in development
- Database integration coming soon
- AI recommendations (Claude API) coming soon
