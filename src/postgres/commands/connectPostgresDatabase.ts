/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { Uri, window } from 'vscode';
import { connectedPostgresKey, postgresFlexibleFilter, postgresSingleFilter } from '../../constants';
import { ext } from "../../extensionVariables";
import { PostgresDatabaseTreeItem } from "../tree/PostgresDatabaseTreeItem";

export async function connectPostgresDatabase(context: IActionContext, treeItem?: Uri | PostgresDatabaseTreeItem): Promise<void> {
    if (!treeItem || treeItem instanceof Uri) {
        if (treeItem) {
            void window.showTextDocument(treeItem);
        }
        treeItem = await ext.rgApi.pickAppResource<PostgresDatabaseTreeItem>(context, {
            filter: [postgresSingleFilter, postgresFlexibleFilter],
            expectedChildContextValue: PostgresDatabaseTreeItem.contextValue
        });
    }

    void ext.context.globalState.update(connectedPostgresKey, treeItem.fullId);
    ext.connectedPostgresDB = treeItem;
    const database = treeItem && treeItem.label;
    if (ext.postgresCodeLensProvider) {
        ext.postgresCodeLensProvider.setConnectedDatabase(database);
    }
    await treeItem.refresh(context);
}
