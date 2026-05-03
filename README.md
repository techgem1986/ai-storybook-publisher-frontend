# Frontend Specification - AI Kid Storybook Publisher

## 1. System Overview
A React-based single-page application (SPA) that provides a user-friendly interface for creating, editing, and downloading AI-generated children's storybooks.

## 2. Technology Stack
- **Framework**: React 19 (TypeScript)
- **Styling**: Tailwind CSS, PostCSS
- **Component Libraries**: 
  - **MUI (Material UI)**: Progress bars, sliders, basic layouts.
  - **Radix UI**: Primitives for accessible UI components (Buttons, Cards, Progress).
- **Icons**: Lucide React
- **API Communication**: 
  - **GraphQL**: Apollo Client or native `fetch` (current implementation uses native `fetch` with GraphQL JSON).
  - **SSE**: Native `EventSource` for real-time status updates.
- **Form Management**: React `useState` hooks.
- **Build Tool**: Create React App (react-scripts).

## 3. Key Components
### BookGenerator (Main Page)
- **Generator Form**: Inputs for `title`, `description` (prompt), `ageGroup` (dropdown), `writingStyle` (dropdown), and `numberOfPages` (slider).
- **Generation Logic**: Toggle between "Quick Generate" (Auto) and "Create Draft" (Review first).
- **Book List**: Grid of `StoryBookCard` components showing recent projects.

### StoryBookCard
- **Visuals**: Displays the book title and a progress bar.
- **Progress Logic**: Interprets status strings from the backend to calculate a percentage (0-100%).
  - *Drafting*: ~10%
  - *Text Ready*: ~20%
  - *Illustrations*: 25% to 90% (linear per page)
  - *PDF Generation*: 92% to 100%
- **Actions**: Download PDF (if complete), Edit (if draft), Delete.

### StoryEditor (Modal/View)
- **Interactive UI**: Preview of each page.
- **Text Editing**: Users can refine the AI-generated text.
- **Styling Panel**:
  - Font Color Picker.
  - Font Size Slider.
  - Font Family Dropdown.
  - Text Background Opacity/Style.

## 4. State Management & API Integration
- **GraphQL Operations**:
  - `GetAllStoryBooks`: Used on mount and after updates.
  - `GenerateStoryDraft` / `GenerateStoryBook`: Triggered by the form.
  - `UpdateStoryContent`: Saves user edits.
  - `FinalizeAndGenerateImages`: Moves from draft to final.
- **SSE Integration**:
  - Establishes connection to `http://localhost:8080/api/status/{id}` when a book is in a non-final state.
  - Updates the `liveStatuses` map in real-time.

## 5. User Interface & Experience
- **Responsive Design**: Mobile-friendly grid layouts.
- **Loading States**: Skeletons or spinners during initial fetch.
- **Real-time Feedback**: Dynamic progress bars and status text (e.g., "Creating illustration for page 3 of 10").
- **Theme**: Light, clean aesthetic using Tailwind's `f8fafc` (Slate 50) background.

## 6. Environment & Deployment
- **Config**: `REACT_APP_API_URL` (points to backend GraphQL endpoint).
- **Docker**: `Dockerfile` using Nginx to serve the production build.
- **Port**: Default `3000` (dev) / `80` (prod).
