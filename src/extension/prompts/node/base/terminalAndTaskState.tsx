/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BasePromptElementProps, PromptElement } from '@vscode/prompt-tsx';
import { ITasksService } from '../../../../platform/tasks/common/tasksService';
import { ITerminalService } from '../../../../platform/terminal/common/terminalService';
import { ToolName } from '../../../tools/common/toolNames';

export interface TerminalAndTaskStateProps extends BasePromptElementProps {
	sessionId?: string;
}

/**
 * PromptElement that gets the current task and terminal state for the chat context.
 */
export class TerminalAndTaskStatePromptElement extends PromptElement<TerminalAndTaskStateProps> {
	/**
	 * Tracks previous counts of tasks and terminals in the previous render.
	 */
	private _lastTaskCount: number = 0;
	private _lastTerminalCount: number = 0;

	constructor(
		props: TerminalAndTaskStateProps,
		@ITasksService private readonly tasksService: ITasksService,
		@ITerminalService private readonly terminalService: ITerminalService
	) {
		super(props);
	}
	async render() {
		const runningTasks: { name: string; isBackground: boolean; type?: string; command?: string; problemMatcher?: string; group?: { isDefault?: boolean; kind?: string }; script?: string; dependsOn?: string }[] = [];
		const running = this.tasksService.getTasks();
		const tasks = Array.isArray(running?.[0]?.[1]) ? running[0][1].filter(t => this.tasksService.isTaskActive(t)) : [];
		for (const exec of tasks) {
			if (exec.label) {
				runningTasks.push({
					name: exec.label,
					isBackground: exec.isBackground,
					type: exec?.type,
					command: exec?.command,
					script: exec.script,
					problemMatcher: Array.isArray(exec.problemMatcher) && exec.problemMatcher.length > 0 ? exec.problemMatcher.join(', ') : '',
					group: exec.group,
					dependsOn: exec.dependsOn,
				});
			}
		}
		let terminals: { name: string; lastCommand: any; id: string }[] = [];
		if (this.terminalService && Array.isArray(this.terminalService.terminals)) {
			const copilotTerminals = await this.terminalService.getCopilotTerminals(this.props.sessionId, true);
			terminals = copilotTerminals.map((term) => {
				const lastCommand = this.terminalService.getLastCommandForTerminal(term);
				return {
					name: term.name,
					lastCommand,
					id: term.id,
				};
			});
		}

		const renderTasks = () =>
			runningTasks.length > 0 && (
				<>
					Active Tasks:<br />
					{runningTasks.map((t) => (
						<>
							Task: {t.name} (background: {String(t.isBackground)}
							{t.type ? `, type: ${t.type}` : ''}
							{t.command ? `, command: ${t.command}` : ''}
							{t.script ? `, script: ${t.script}` : ''})<br />
							{t.problemMatcher ? `Problem Matchers: ${t.problemMatcher}` : ''}<br />
							{t.group ? `Group: ${t.group.isDefault ? 'isDefault ' + (t.group.kind ?? '') : (t.group.kind ?? '')} ` : ''}<br />
							{t.dependsOn ? `Depends On: ${t.dependsOn}` : ''}<br />
							<br />
						</>
					))}
				</>
			);

		const renderTerminals = () =>
			terminals.length > 0 && (
				<>
					Active Terminals:<br />
					{terminals.map((term) => (
						<>
							Terminal: {term.name}<br />
							{term.lastCommand ? (
								<>
									Last Command: {term.lastCommand.commandLine ?? '(no last command)'}<br />
									Cwd: {term.lastCommand.cwd ?? '(unknown)'}<br />
									Exit Code: {term.lastCommand.exitCode ?? '(unknown)'}<br />
								</>
							) : ''}
							Output: {'{'}Use {ToolName.GetTerminalOutput} for terminal with ID: {term.id}.{'}'}<br />
						</>
					))}
				</>
			);


		const prevTaskCount = this._lastTaskCount;
		const prevTerminalCount = this._lastTerminalCount;
		const taskCount = tasks.length;
		const terminalCount = terminals?.length;

		// Update for next turn
		this._lastTaskCount = taskCount;
		this._lastTerminalCount = terminalCount;

		const taskCountDropped = prevTaskCount > 0 && taskCount === 0;
		const terminalCountDropped = prevTerminalCount > 0 && terminalCount === 0;
		if (taskCountDropped && terminalCountDropped) {
			return 'No active tasks or terminals found.';
		} else if (taskCountDropped && terminalCount > 0) {
			return (
				<>
					No active tasks found.<br />
					{renderTerminals()}
				</>
			);
		} else if (terminalCountDropped && taskCount > 0) {
			return (
				<>
					{renderTasks()}
					No active terminals found.<br />
				</>
			);
		}

		if (tasks.length > 0 && terminals.length > 0) {
			return (
				<>
					{renderTasks()}
					{renderTerminals()}
				</>
			);
		} else if (tasks.length > 0) {
			return (
				<>
					{renderTasks()}
				</>
			);
		} else if (terminals.length > 0) {
			return (
				<>
					{renderTerminals()}
				</>
			);
		}
	}
}