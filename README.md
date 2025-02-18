API Documentation Generator
Overview
The API Documentation Generator is a Visual Studio Code (VSCode) extension designed to automatically generate and update OpenAPI documentation for your API projects. This extension parses comments in your codebase to create an openapi.json file, which can be used with Swagger UI for interactive API documentation.

Features
Automatically generates openapi.json from code comments.
Supports multiple programming languages (JavaScript, TypeScript, C++, etc.).
Watches for file changes and updates the documentation in real-time.
Launches Swagger UI to visualize the API documentation.
Installation
Prerequisites
Visual Studio Code (VSCode)
Node.js and npm (for installing dependencies)
Steps
Download the Extension:

Download the .vsix file from the releases page.
Install the Extension:

Open VSCode.
Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing Ctrl+Shift+X.
Click on the ... menu in the Extensions view and select Install from VSIX....
Select the downloaded .vsix file and click Install.
Usage
Generating API Documentation
Open Your Project:

Open your API project in VSCode.
Generate Documentation:

Use the command palette (Ctrl+Shift+P) and select Generate API Documentation.
The extension will parse the comments in your codebase and generate an openapi.json file in the docs directory.
Automatic Updates
The extension watches for changes in your codebase. Whenever you modify a file, the openapi.json file is automatically updated to reflect the changes.
Launching Swagger UI
Set Up Swagger UI:

Download the Swagger UI distribution from the Swagger UI GitHub repository.
Place the Swagger UI files in a directory named swagger-ui in your project root.
Configure Swagger UI:

Open the index.html file in the swagger-ui directory.
Set the url to point to your openapi.json file:

url: "openapi.json",
Serve Swagger UI:

Install live-server globally using npm:

npm install -g live-server
Navigate to the swagger-ui directory in your terminal and run:

live-server . --port=8080 --no-browser
Open your web browser and navigate to http://localhost:8080 to view the Swagger UI.
Comment Format
To generate the documentation, use the following comment format in your code:


/**
 * @endpoint POST /api/resource Create Resource
 * @description This endpoint creates a new resource.
 * @request {
 *   "name": "string",
 *   "value": "string"
 * }
 * @response 201 {
 *   "id": "string",
 *   "name": "string",
 *   "value": "string"
 * }
 */
Contributing
Contributions are welcome! Please open an issue or submit a pull request.

License
This project is licensed under the MIT License. See the LICENSE file for details.
