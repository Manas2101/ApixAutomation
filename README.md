# APIX Automation Tool

A comprehensive automation tool for generating APIX YAML metadata files for API repository audits. This tool streamlines the audit process by automatically creating standardized APIX metadata files from Excel data and creating pull requests to add them to repositories.

## Features

- 🔍 **Repository Search**: Search for API metadata by GitHub repository URL
- 📝 **Auto-Generate YAML**: Automatically generate APIX YAML files from Excel data
- 👁️ **Preview**: Preview the generated YAML before committing
- 🚀 **PR Creation**: Automatically create pull requests to add APIX files to repositories
- 💾 **Excel Integration**: Load API metadata from Excel/CSV files
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and TailwindCSS

## Project Structure

```
ApixAutomation/
├── backend/
│   ├── app.py              # Flask API server
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   ├── main.jsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── package.json       # Node dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── tailwind.config.js # TailwindCSS configuration
│   └── index.html         # HTML template
├── sample_api_data.csv    # Sample API metadata
└── README.md              # This file
```

## Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **npm or yarn**
- **GitHub Personal Access Token** (for PR creation)

## Installation

### 1. Clone or Navigate to the Project

```bash
cd /Users/kritikapandey/Desktop/ApixAutomation
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

## Configuration

### Sample Data File

The project includes a `sample_api_data.csv` file with example API metadata. You can replace this with your own Excel/CSV file containing the following columns:

- `repository_url`: GitHub repository URL
- `api_technical_name`: Technical name of the API
- `version`: API version
- `snow_business_application_id`: ServiceNow Business Application ID
- `platform`: Platform (gcp, aws-eks, azure, caep)
- `lifecycle_status`: Status (active, demised, excluded, pre_release)
- `classification`: Classification level (internal, confidential, restricted, public)
- `description`: API description
- `owner_team`: Team owning the API
- `contact_email`: Contact email for the team

### GitHub Token

To create pull requests, you'll need a GitHub Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name
4. Select the `repo` scope (full control of private repositories)
5. Click "Generate token"
6. Copy the token (you won't be able to see it again!)

## Running the Application

### Start Backend Server

```bash
# From the backend directory
cd backend
source venv/bin/activate  # Activate virtual environment
python app.py
```

The backend will start on `http://localhost:5000`

### Start Frontend Development Server

Open a new terminal:

```bash
# From the frontend directory
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Access the Application

Open your browser and navigate to: `http://localhost:3000`

## Usage

### Step 1: Search for Repository

1. Enter a GitHub repository URL in the input field (e.g., `https://github.com/example/payment-api`)
2. Click the **Search** button
3. The tool will search for matching API data in the Excel file

### Step 2: Generate YAML

1. Once API data is found, click **Auto Generate YAML**
2. The tool will create an APIX YAML file based on the metadata

### Step 3: Preview YAML

1. Click **Preview YAML** to view the generated file
2. Review the content to ensure accuracy

### Step 4: Create Pull Request

1. Enter your GitHub Personal Access Token
2. Click **Create Pull Request**
3. The tool will:
   - Create a new branch in the repository
   - Add the `apix.yaml` file to the repository
   - Create a pull request for review

## APIX YAML Format

The generated APIX YAML file follows this structure:

```yaml
apiVersion: apix.io/v1
kind: APIMetadata
metadata:
  name: payment-service-api
  version: v2.1.0
  createdAt: '2024-01-15T10:30:00'
  updatedAt: '2024-01-15T10:30:00'
spec:
  technicalName: payment-service-api
  version: v2.1.0
  snow:
    businessApplicationId: APP001234
  platform: gcp
  lifecycle:
    status: active
  classification: internal
  description: Payment processing API for e-commerce transactions
  ownership:
    team: Payment Team
    contact: payment-team@example.com
```

## API Endpoints

### Backend API

- **POST /api/search**: Search for API data by repository URL
- **POST /api/generate-yaml**: Generate APIX YAML file
- **POST /api/create-pr**: Create a pull request with the YAML file
- **GET /api/health**: Health check endpoint

## Customization

### Updating the Data Source

To use your own Excel file:

1. Replace `sample_api_data.csv` with your file
2. Update the `DATA_FILE` path in `backend/app.py` if needed
3. Ensure your file has all required columns

### Modifying YAML Template

To customize the YAML structure:

1. Edit the `generate_apix_yaml()` function in `backend/app.py`
2. Modify the dictionary structure to match your requirements

### Styling the UI

The frontend uses TailwindCSS for styling:

1. Edit `frontend/src/App.jsx` to modify components
2. Update `frontend/tailwind.config.js` for theme customization

## Troubleshooting

### Backend Issues

**Problem**: Module not found errors
```bash
# Solution: Ensure virtual environment is activated and dependencies installed
source venv/bin/activate
pip install -r requirements.txt
```

**Problem**: Port 5000 already in use
```bash
# Solution: Change port in backend/app.py
app.run(debug=True, port=5001)  # Use different port
```

### Frontend Issues

**Problem**: npm install fails
```bash
# Solution: Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Port 3000 already in use
```bash
# Solution: Vite will automatically suggest another port, or specify one
# Edit vite.config.js and change the port number
```

### GitHub PR Creation Issues

**Problem**: "Failed to access repository"
- Verify the repository URL is correct
- Ensure your GitHub token has `repo` scope
- Check that you have write access to the repository

**Problem**: "Failed to create branch"
- Ensure the repository exists and is accessible
- Verify your token permissions
- Check if a branch with the same name already exists

## Security Considerations

- **Never commit your GitHub token** to version control
- Store tokens securely (use environment variables in production)
- Limit token scope to only required permissions
- Rotate tokens regularly
- Use `.gitignore` to exclude sensitive files

## Future Enhancements

- [ ] Support for Excel (.xlsx) files directly
- [ ] Bulk YAML generation for multiple repositories
- [ ] Custom YAML templates
- [ ] Integration with CI/CD pipelines
- [ ] API authentication and user management
- [ ] Audit trail and logging
- [ ] Support for multiple data sources
- [ ] YAML validation before PR creation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for internal use. Please consult your organization's policies before sharing or modifying.

## Support

For issues or questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

---

**Built with ❤️ for streamlining API repository audits**
