# Zippp Project Delegation Workflow

## Overview
This workflow uses Claude Code as the primary coding agent for implementing the zippp bilingual landing page and app. Hermes acts as the coordinator, delegating specific tasks to Claude Code while maintaining high-level oversight.

## Delegation Setup

### Model Configuration
- **Primary Model**: Sonnet 5.5 (`claude-sonnet-5-5`) - For complex tasks and implementation
- **Fallback Model**: Haiku 4.5 (`claude-haiku-4-5-20251001`) - For simpler tasks and cost optimization
- **Max Budget**: $5.00 per task
- **Max Turns**: 10 (prevents runaway loops)

### Tools Configuration
- **Allowed Tools**: Read, Edit, Write, Bash
- **Permission Mode**: acceptEdits (auto-approves file edits)
- **Working Directory**: ~/dev/work/appworkz/zippp.link

## Delegation Strategy

### Phase 1: Landing Page Implementation
**Task**: Create bilingual landing page with hero section, process steps, FAQ
**Command**: 
```bash
claude -p "Implement the landing page (/) with bilingual support. Create Hero component with 'Photo in. Table out.' / 'Foto masuk. Tabel keluar.' Add three-step process section in both languages. Include FAQ section with Indonesian/English content. Use Tailwind CSS for styling. Update existing page.tsx to use the new components." --model sonnet --max-turns 10 --allowedTools "Read,Edit,Write"
```

### Phase 2: App Route Implementation  
**Task**: Create 5-screen mobile app interface
**Command**:
```bash
claude -p "Implement the /app route with 5 screens following the bilingual specifications in zippp-wording.md. Create components for: 1) Empty screen (drop/camera), 2) Reading screen, 3) Result screen with table, 4) Bad photo screen. Use mobile-first responsive design with Tailwind CSS. Implement bilingual UI text using the language prop pattern." --model sonnet --max-turns 15 --allowedTools "Read,Edit,Write"
```

### Phase 3: Technical Implementation
**Task**: Set up Google OAuth and mock API
**Command**:
```bash
claude -p "Set up Google OAuth integration for user authentication. Create mock API endpoints for receipt processing. Implement form validation for date, staff, and items. Add Google Sheets integration placeholder. Ensure all components are properly typed with TypeScript." --model sonnet --max-turns 12 --allowedTools "Read,Edit,Write,Bash"
```

### Phase 4: Localization
**Task**: Complete Indonesian/English localization
**Command**:
```bash
claude -p "Implement language toggle component. Add currency formatting for IDR (Rp). Update all Indonesian text to use proper business terminology. Add cultural context adjustments for Indonesian users. Ensure consistent bilingual support across all components." --model haiku --max-turns 8 --allowedTools "Read,Edit,Write"
```

## Delegation Best Practices

### Task Management
- **Small, focused tasks**: Each delegation should be a single, well-defined feature
- **Clear boundaries**: Specify which files to work with and which to avoid
- **Progressive complexity**: Start with simple components, move to complex integrations
- **Quality checks**: Always verify output before proceeding to next task

### Cost Optimization
- **Model selection**: Use Haiku for simple tasks, Sonnet for complex ones
- **Turn limits**: Set appropriate max-turns to prevent runaway costs
- **Fallback strategy**: Let Claude automatically fallback to Haiku when Sonnet is overloaded

### Quality Assurance
- **Code review**: Use Claude's built-in review capabilities
- **Type safety**: Ensure TypeScript types are maintained
- **Responsive design**: Verify mobile-first implementation
- **Bilingual consistency**: Check that both languages are properly implemented

## Monitoring and Control

### Progress Tracking
- Use `claude session list` to track active sessions
- Monitor with `claude stats` for token usage
- Check `tmux capture-pane` for long-running tasks

### Session Management
- **Resume sessions**: `claude -c` to continue most recent session
- **Specific sessions**: `claude -r <session_id>` for specific tasks
- **Clean up**: Kill tmux sessions when done

## Error Handling

### Common Issues
- **Model overload**: Automatic fallback to Haiku
- **Permission issues**: Use `acceptEdits` mode for file operations
- **Context limits**: Use `/compact` in interactive sessions
- **Budget limits**: Set `maxBudgetUsd` to prevent overspending

### Recovery Steps
1. Check session status with `claude auth status`
2. Verify model availability with `claude --model`
3. Reset permissions if needed
4. Start fresh session with new task

## Success Metrics

### Quality Indicators
- ✅ All components properly typed
- ✅ Bilingual support consistent across UI
- ✅ Mobile-responsive design working
- ✅ No TypeScript compilation errors
- ✅ Proper error handling implemented

### Cost Efficiency
- Average cost per task: < $2.00
- Total project cost: < $20.00
- Token efficiency: > 80% useful output

### Timeline
- Landing page: 1-2 tasks
- App interface: 2-3 tasks  
- Technical setup: 2-3 tasks
- Localization: 1-2 tasks
- **Total**: 6-10 delegated tasks