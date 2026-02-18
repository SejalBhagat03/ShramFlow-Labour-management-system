# Labour Work Management System - ShramFlow

A comprehensive Labour Work Management System designed for supervisors managing street light pole digging work in Nagpur. Built with React, Node.js, Express, and MongoDB.

## 🚀 Features

### ✅ Implemented Features

#### 1. **Group Work Entry System**
- Multi-labour selection for work groups
- Task types: Digging Hole, Pole Installation, Cable Laying, Maintenance, Repair Work, Custom Task
- Real-time meter validation (prevents fraud)
- Total work area distribution with live remaining meter counter
- Automatic payment calculation based on meters and task rates

#### 2. **Location Management**
- Structured dropdown with all major Nagpur areas
- GPS-based location capture
- Reverse geocoding for location names

#### 3. **Labour Profile & History**
- Complete work history for each labour
- Date-wise work records
- Location and task tracking
- Auto-calculated payment records
- Performance metrics (total earnings, total meters, pending payments)

#### 4. **Edit History Tracking**
- Full audit trail for all work entry modifications
- Tracks who edited, when, and what changed
- Previous and updated data comparison

#### 5. **Bilingual Support (Hindi/English)**
- Complete UI translation
- Hindi font support (Noto Sans Devanagari)
- Dynamic language toggle
- All labels, buttons, and messages translated

#### 6. **Fraud Prevention**
- Backend validation: `SUM(individual meters) <= total work area`
- Frontend real-time validation
- Disabled save button when limits exceeded
- Clear error messaging

#### 7. **Mobile-Responsive UI**
- Large buttons for easy interaction
- Simple, intuitive interface
- Optimized for low-technical users
- Touch-friendly design

## 🛠️ Tech Stack

### Frontend
- **React 19.2.3** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Lucide React** - Icons
- **Sonner** - Toast notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM

## 📦 Installation

### Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud instance)
- npm or yarn

### Frontend Setup

```bash
cd labour-hub-main
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Backend Setup

```bash
cd labour-hub-main/server
npm install

# Configure MongoDB connection
# Edit server/.env and set:
# MONGODB_URI=mongodb://localhost:27017/shramflow

npm run dev
```

The backend API will run on `http://localhost:5000`

## 🗂️ Project Structure

```
labour-hub-main/
├── src/
│   ├── pages/
│   │   ├── GroupWorkEntry.jsx    # Group work entry with validation
│   │   ├── LabourProfile.jsx     # Labour history and stats
│   │   ├── WorkEntries.jsx       # Work entries list
│   │   └── ...
│   ├── components/
│   │   └── ui/                   # Reusable UI components
│   ├── lib/
│   │   └── i18n.js               # Bilingual translations
│   ├── contexts/
│   │   └── LanguageContext.jsx   # Language state management
│   └── ...
├── server/
│   ├── models/
│   │   ├── Labour.js             # Labour schema
│   │   ├── DailyWork.js          # Work entry schema with validation
│   │   ├── WorkGroup.js          # Work group schema
│   │   └── EditHistory.js        # Audit log schema
│   ├── routes/
│   │   ├── labourRoutes.js       # Labour CRUD endpoints
│   │   ├── workRoutes.js         # Work entry endpoints
│   │   └── historyRoutes.js      # Edit history endpoints
│   └── index.js                  # Express server
└── ...
```

## 🔑 Key Workflows

### Creating a Group Work Entry

1. Navigate to Dashboard → Click "Add Group Entry"
2. Fill in:
   - Date
   - Location (select from Nagpur areas)
   - Task Type
   - Total Work Area (meters)
3. Select multiple labours from the list
4. Enter individual meters for each labour
5. System validates: `SUM(individual) <= total`
6. Save (disabled if validation fails)

### Viewing Labour Profile

1. Navigate to Labourers page
2. Click on any labour card
3. View complete work history with:
   - Date, Location, Task, Meters
   - Payment details
   - Status (Paid/Pending)

### Language Toggle

- Click the language toggle in the header
- All UI elements update dynamically
- Hindi text renders with proper Devanagari font

## 🔒 Validation & Fraud Prevention

### Frontend Validation
- Real-time meter sum calculation
- Live remaining meter display
- Disabled save button when invalid
- Clear error alerts

### Backend Validation
- Mongoose pre-save hook validates meter distribution
- Returns error if `SUM(individual meters) > total area`
- Prevents data corruption

## 🌍 Nagpur Areas Supported

Sadar, Civil Lines, Dharampeth, Ramdaspeth, Shankar Nagar, Pratap Nagar, Trimurti Nagar, Manish Nagar, Wardha Road, Narendra Nagar, Besa, Beltarodi, MIHAN, Hingna, Pardi, Itwari, Mahal, Manewada, Somalwada, Koradi Road, Zingabai Takli

## 📝 API Endpoints

### Labour Management
- `GET /api/labourers` - Get all labourers
- `POST /api/labourers` - Create new labour
- `GET /api/labourers/:id/history` - Get labour work history

### Work Entries
- `GET /api/work` - Get all work entries
- `POST /api/work` - Create new work entry (with validation)
- `PUT /api/work/:id` - Update work entry (logs to edit history)

### Edit History
- `GET /api/history/:entityType/:entityId` - Get edit history for an entity

## 🎨 UI/UX Features

- **Large Touch Targets**: Buttons sized for easy mobile interaction
- **Real-time Feedback**: Live validation and error messages
- **Bilingual Labels**: All text translates seamlessly
- **Mobile-First Design**: Optimized for supervisors in the field
- **Clear Visual Hierarchy**: Important information prominently displayed

## 🚧 Future Enhancements

- Map-based location selection with interactive Nagpur map
- Advanced reporting and analytics
- SMS notifications for payment updates
- Offline support with sync
- Photo evidence upload for work verification

## 📄 License

This project is proprietary software developed for labour management in Nagpur.

## 👥 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for efficient labour management in Nagpur**
