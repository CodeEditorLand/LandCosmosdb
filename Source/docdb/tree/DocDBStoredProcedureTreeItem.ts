/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type Resource, type StoredProcedureDefinition } from "@azure/cosmos";
import {
	AzExtTreeItem,
	DialogResponses,
	openReadOnlyJson,
	randomUtils,
	type IActionContext,
	type TreeItemIconPath,
} from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";

import { type IEditableTreeItem } from "../../DatabasesFileSystem";
import { ext } from "../../extensionVariables";
import { localize } from "../../utils/localize";
import { nonNullProp } from "../../utils/nonNull";
import { type DocDBStoredProceduresTreeItem } from "./DocDBStoredProceduresTreeItem";
import { type IDocDBTreeRoot } from "./IDocDBTreeRoot";

/**
 * Represents a Cosmos DB DocumentDB (SQL) stored procedure
 */
export class DocDBStoredProcedureTreeItem
	extends AzExtTreeItem
	implements IEditableTreeItem
{
	public static contextValue: string = "cosmosDBStoredProcedure";

	public readonly contextValue: string =
		DocDBStoredProcedureTreeItem.contextValue;

	public readonly cTime: number = Date.now();

	declare public readonly parent: DocDBStoredProceduresTreeItem;

	public mTime: number = Date.now();

	constructor(
		parent: DocDBStoredProceduresTreeItem,
		public procedure: StoredProcedureDefinition & Resource,
	) {
		super(parent);

		ext.fileSystem.fireChangedEvent(this);

		this.commandId = "cosmosDB.openStoredProcedure";
	}

	public get root(): IDocDBTreeRoot {
		return this.parent.root;
	}

	public get filePath(): string {
		return this.label + "-cosmos-stored-procedure.js";
	}

	public get id(): string {
		return this.procedure.id;
	}

	public get label(): string {
		return this.procedure.id;
	}

	public get link(): string {
		return this.procedure._self;
	}

	public async getFileContent(): Promise<string> {
		return typeof this.procedure.body === "string"
			? this.procedure.body
			: "";
	}

	public async refreshImpl(): Promise<void> {
		ext.fileSystem.fireChangedEvent(this);
	}

	public async writeFileContent(
		_context: IActionContext,
		content: string,
	): Promise<void> {
		const client = this.root.getCosmosClient();

		const replace = await this.parent
			.getContainerClient(client)
			.scripts.storedProcedure(this.id)
			.replace({ id: this.id, body: content });

		this.procedure = nonNullProp(replace, "resource");
	}

	public get iconPath(): TreeItemIconPath {
		return new vscode.ThemeIcon("server-process");
	}

	public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
		const message: string = localize(
			"deleteCosmosStoredProcedure",
			`Are you sure you want to delete stored procedure '{0}'?`,
			this.label,
		);

		await context.ui.showWarningMessage(
			message,
			{ modal: true, stepName: "deleteStoredProcedure" },
			DialogResponses.deleteResponse,
		);

		const client = this.root.getCosmosClient();

		await this.parent
			.getContainerClient(client)
			.scripts.storedProcedure(this.id)
			.delete();
	}

	public async execute(
		context: IActionContext,
		partitionKey: string,
		parameters?: unknown[],
	): Promise<void> {
		const client = this.root.getCosmosClient();

		const result = await this.parent
			.getContainerClient(client)
			.scripts.storedProcedure(this.id)
			.execute(partitionKey, parameters);

		try {
			const resultFileName = `${this.label}-result`;

			await openReadOnlyJson(
				{
					label: resultFileName,
					fullId: randomUtils.getRandomHexString(),
				},
				result,
			);
		} catch {
			await context.ui.showWarningMessage(
				`Unable to parse execution result`,
			);
		}
	}
}
