# Workspace Rules & Development Guidelines

## Git & Deployment Workflow
- **Pull Requests for Updates**: For all future updates, do NOT push directly to the `main` branch. Always create a new feature branch and open a Pull Request (PR).
- **Validation**: Verify that the new code changes run correctly, pass tests, and do not break or regress existing models/views.
- **Merge Criteria**: Only merge the PR into `main` after verification is successful.

## Core Codebase Guidelines (Before making any code changes)
1. **Understand first**: Read and understand the existing implementation before proposing or writing code.
2. **Preserve Rules**: Preserve every business rule, database interaction, validation rule, and user workflow.
3. **Targeted Improvements**: Improve only the implementation, structure, maintainability, and user experience. Never rewrite working business logic unless it is explicitly incorrect.
4. **Incremental Commits**: Make small, incremental commits. The application must remain deployable after every completed task.
5. **Traceability**: Update GitHub Issue progress to maintain full task and workflow traceability.

