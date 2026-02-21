from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'safeway.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Database Models ---

class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "phone": self.phone}

class JournalEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "timestamp": self.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        }

# Create the database tables
with app.app_context():
    db.create_all()

# --- Routes ---

@app.route('/')
def index():
    """Serve the main frontend page."""
    return render_template('index.html')

# --- Trusted Contacts API ---

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    """Fetch all trusted contacts."""
    contacts = Contact.query.all()
    return jsonify([c.to_dict() for c in contacts])

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    """Add a new trusted contact."""
    data = request.json
    if not data or 'name' not in data or 'phone' not in data:
        return jsonify({"error": "Name and phone are required"}), 400
    
    new_contact = Contact(name=data['name'], phone=data['phone'])
    db.session.add(new_contact)
    db.session.commit()
    return jsonify(new_contact.to_dict()), 201

@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    """Delete a trusted contact."""
    contact = Contact.query.get(contact_id)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    db.session.delete(contact)
    db.session.commit()
    return jsonify({"message": "Contact deleted successfully"})

# --- Incident Journal API ---

@app.route('/api/journal', methods=['GET'])
def get_journal():
    """Fetch all journal entries, latest first."""
    entries = JournalEntry.query.order_by(JournalEntry.timestamp.desc()).all()
    return jsonify([e.to_dict() for e in entries])

@app.route('/api/journal', methods=['POST'])
def add_journal():
    """Save a new incident report."""
    data = request.json
    if not data or 'title' not in data or 'description' not in data:
        return jsonify({"error": "Title and description are required"}), 400
    
    new_entry = JournalEntry(title=data['title'], description=data['description'])
    db.session.add(new_entry)
    db.session.commit()
    return jsonify(new_entry.to_dict()), 201

@app.route('/api/journal/<int:entry_id>', methods=['DELETE'])
def delete_journal(entry_id):
    """Delete an incident report."""
    entry = JournalEntry.query.get(entry_id)
    if not entry:
        return jsonify({"error": "Entry not found"}), 404
    
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Journal entry deleted successfully"})

# --- SOS / Emergency Alert API ---

@app.route('/send-sos', methods=['POST'])
def send_sos():
    """Receive SOS alert data and send real SMS via Twilio."""
    data = request.json
    location = data.get('location', 'Unknown')
    map_link = data.get('mapLink', 'No Link')
    contacts = data.get('contacts', [])

    print("\n" + "="*40)
    print("🚨 EMERGENCY SOS ALERT RECEIVED 🚨")
    print(f"TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"LOCATION: {location}")
    print(f"MAP LINK: {map_link}")
    
    print("⚖️ SOS Alert logged to server (WhatsApp will be triggered on frontend)")
    print("="*40 + "\n")

    return jsonify({
        "status": "success", 
        "message": "SOS Alert logged to server."
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
