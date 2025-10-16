# APIX Automation Workflow

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     APIX Automation Tool                         │
│                  API Audit Metadata Generator                    │
└─────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │   USER   │
                              └────┬─────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Enter GitHub Repo URL   │
                    │  (Frontend - React UI)   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   Click "Search" Button  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   POST /api/search       │
                    │   (Backend - Flask)      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Load sample_api_data.csv│
                    │  (pandas DataFrame)      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Normalize & Match URL   │
                    │  (URL comparison logic)  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
            ┌──────────────┐         ┌──────────────┐
            │  Found! ✅   │         │ Not Found ❌ │
            └──────┬───────┘         └──────┬───────┘
                   │                        │
                   │                        ▼
                   │              ┌──────────────────┐
                   │              │ Show Error Msg   │
                   │              │ "Repo not found" │
                   │              └──────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  Display API Metadata    │
        │  - Technical Name        │
        │  - Version               │
        │  - Platform              │
        │  - Lifecycle Status      │
        │  - Classification        │
        │  - SNOW App ID           │
        │  - Description           │
        │  - Owner Team            │
        │  - Contact Email         │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Click "Auto Generate     │
        │       YAML" Button       │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ POST /api/generate-yaml  │
        │ (Backend - Flask)        │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ generate_apix_yaml()     │
        │ - Create YAML structure  │
        │ - Add metadata           │
        │ - Add spec fields        │
        │ - Convert to YAML format │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Return YAML Content      │
        │ (PyYAML formatted)       │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Show Success Message ✅  │
        │ "YAML generated!"        │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Click "Preview YAML"     │
        │      Button              │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Display YAML Preview     │
        │ (Syntax highlighted)     │
        │                          │
        │ apiVersion: apix.io/v1   │
        │ kind: APIMetadata        │
        │ metadata:                │
        │   name: api-name         │
        │   version: v1.0.0        │
        │ spec:                    │
        │   ...                    │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ User Reviews YAML        │
        │ (Verify accuracy)        │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Enter GitHub Personal    │
        │    Access Token          │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Click "Create Pull       │
        │     Request" Button      │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ POST /api/create-pr      │
        │ (Backend - Flask)        │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Parse Repo Owner & Name  │
        │ from GitHub URL          │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ GitHub API: Get Repo Info│
        │ - Verify access          │
        │ - Get default branch     │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ GitHub API: Create Branch│
        │ Name: apix-metadata-     │
        │       YYYYMMDD-HHMMSS    │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ GitHub API: Create File  │
        │ Path: apix.yaml          │
        │ Content: Base64 encoded  │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ GitHub API: Create PR    │
        │ Title: "Add APIX         │
        │         metadata file"   │
        │ Body: Auto-generated msg │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Return PR URL & Number   │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Show Success Message ✅  │
        │ "PR created! #123"       │
        │ Display clickable link   │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ User Clicks PR Link      │
        │ Opens GitHub in browser  │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Review & Merge PR        │
        │ on GitHub                │
        └──────────────────────────┘
                     │
                     ▼
                ┌─────────┐
                │  DONE!  │
                └─────────┘
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Search Input │  │ YAML Preview │  │ PR Creation  │          │
│  │   Component  │  │   Component  │  │   Component  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          │    HTTP/REST    │                  │
          │    (Axios)      │                  │
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼───────────────────┐
│         ▼                 ▼                  ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /api/search  │  │/api/generate │  │ /api/create  │          │
│  │              │  │    -yaml     │  │     -pr      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │           Flask Application (app.py)             │           │
│  │  - Route handlers                                │           │
│  │  - Business logic                                │           │
│  │  - Data processing                               │           │
│  └──────┬───────────────────────┬───────────────────┘           │
│         │                       │                               │
│         ▼                       ▼                               │
│  ┌──────────────┐       ┌──────────────┐                       │
│  │   pandas     │       │   PyYAML     │                       │
│  │ (CSV Reader) │       │ (Generator)  │                       │
│  └──────┬───────┘       └──────────────┘                       │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │   requests   │                                              │
│  │ (GitHub API) │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│                         BACKEND (Flask)                         │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────┐                    ┌──────────────┐           │
│  │ GitHub API   │                    │ CSV/Excel    │           │
│  │ - Repos      │                    │ Data File    │           │
│  │ - Branches   │                    │              │           │
│  │ - Files      │                    │              │           │
│  │ - Pull Reqs  │                    │              │           │
│  └──────────────┘                    └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│ User Input   │  GitHub Repo URL
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Frontend     │  Validates & sends to backend
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Backend API  │  Receives request
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CSV File     │  Searches for matching repo
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ API Data     │  Extracts metadata
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ YAML Gen     │  Generates APIX YAML
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Frontend     │  Displays preview
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ User Review  │  Verifies content
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ GitHub API   │  Creates PR
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Success!     │  PR URL returned
└──────────────┘
```

## State Management

```
Application State Flow:

IDLE
  │
  ├─ User enters URL
  │
  ▼
SEARCHING
  │
  ├─ API call in progress
  │
  ▼
FOUND / NOT_FOUND
  │
  ├─ If FOUND: Display data
  │
  ▼
GENERATING
  │
  ├─ Creating YAML
  │
  ▼
YAML_READY
  │
  ├─ Preview available
  │
  ▼
CREATING_PR
  │
  ├─ GitHub API calls
  │
  ▼
PR_CREATED / PR_FAILED
  │
  └─ Show result
```

## Error Handling Flow

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Try Block    │
└──────┬───────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐   ┌──────────┐
│ Success  │   │  Error   │
└────┬─────┘   └────┬─────┘
     │              │
     ▼              ▼
┌──────────┐   ┌──────────┐
│ Show     │   │ Catch    │
│ Success  │   │ Error    │
│ Message  │   └────┬─────┘
└──────────┘        │
                    ▼
               ┌──────────┐
               │ Log      │
               │ Error    │
               └────┬─────┘
                    │
                    ▼
               ┌──────────┐
               │ Show     │
               │ User     │
               │ Message  │
               └──────────┘
```

## File Generation Process

```
API Data (from CSV)
       │
       ▼
┌─────────────────────┐
│ Create Dictionary   │
│ Structure:          │
│ - apiVersion        │
│ - kind              │
│ - metadata          │
│ - spec              │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Populate Fields     │
│ - name              │
│ - version           │
│ - timestamps        │
│ - platform          │
│ - lifecycle         │
│ - classification    │
│ - ownership         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ PyYAML Conversion   │
│ yaml.dump()         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ YAML String Output  │
│ (Formatted)         │
└─────────────────────┘
```

## GitHub PR Creation Steps

```
1. Authenticate
   └─ Verify token with GitHub API

2. Get Repository Info
   └─ Fetch default branch (main/master)

3. Get Branch SHA
   └─ Get commit SHA of default branch

4. Create New Branch
   └─ Name: apix-metadata-TIMESTAMP

5. Encode File Content
   └─ Base64 encode YAML content

6. Create/Update File
   └─ Add apix.yaml to new branch

7. Create Pull Request
   └─ From new branch to default branch

8. Return PR Details
   └─ URL and PR number
```

---

## Quick Reference

### Frontend → Backend
- `POST /api/search` - Search for repo
- `POST /api/generate-yaml` - Generate YAML
- `POST /api/create-pr` - Create PR

### Backend → External
- pandas → CSV file
- PyYAML → YAML generation
- requests → GitHub API

### User Journey
1. Enter URL → 2. Search → 3. Generate → 4. Preview → 5. Create PR

---

**This workflow ensures a smooth, automated process from data lookup to PR creation!**
