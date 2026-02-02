/**
 * 文件操作模块
 * 负责文件的打开、保存、另存为和导出
 */

import { DialogManager } from './dialog-manager.js';

// 获取 Tauri invoke 函数
const invoke = () => window.__TAURI__.core.invoke;

export class FileManager {
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * 打开文件
     * @returns {Promise<boolean>}
     */
    async openFile() {
        console.log('openFile 方法被调用');
        
        // 检查场景状态
        const shouldContinue = await this.editor.checkSceneStateBeforeAction(async () => {
            try {
                const result = await invoke()('open_ujson_file');
                console.log('读取的文件结果:', result);
                
                const [content, filePath] = result;
                const ujsonData = JSON.parse(content);
                
                await this.loadFromUJson(ujsonData);
                this.editor.sceneManager.currentFilePath = filePath;
                this.editor.sceneManager.isSceneDirty = false;
                this.editor.sceneManager.hasBeenSaved = true;
                this.editor.sceneManager.isCleanScene = false;
                this.editor.sceneManager.updateWindowTitle();
                
                console.log('场景打开完成, 路径:', filePath);
                return true;
            } catch (error) {
                console.error('打开场景失败:', error);
                if (error !== "用户取消了打开操作") {
                    alert('打开场景失败: ' + error);
                }
                return false;
            }
        });
        
        return shouldContinue;
    }

    /**
     * 保存文件
     * @param {boolean} showSuccessDialog - 是否显示成功对话框
     * @returns {Promise<boolean>}
     */
    async saveFile(showSuccessDialog = true) {
        console.log('saveFile 方法被调用, showSuccessDialog:', showSuccessDialog);
        try {
            const ujsonData = await this.generateUJson();
            console.log('生成的UJson数据长度:', ujsonData.length);
            
            // 如果没有关联文件，走另存为逻辑
            if (!this.editor.sceneManager.currentFilePath || !this.editor.sceneManager.hasBeenSaved) {
                console.log('没有关联文件，转到另存为');
                return await this.saveAsFile(showSuccessDialog);
            }
            
            console.log('保存到现有文件:', this.editor.sceneManager.currentFilePath);
            const result = await invoke()('save_ujson_to_path', { 
                filePath: this.editor.sceneManager.currentFilePath, 
                content: ujsonData 
            });
            
            console.log('保存命令执行完成，结果:', result);
            this.editor.sceneManager.markSceneSaved();
            
            if (showSuccessDialog) {
                DialogManager.showSaveSuccessDialog(this.editor.sceneManager.currentFilePath, false);
            }
            
            console.log('场景保存完成，返回true');
            return true;
        } catch (error) {
            console.error('保存场景失败:', error);
            alert('保存场景失败: ' + error);
            return false;
        }
    }

    /**
     * 另存为文件
     * @param {boolean} showSuccessDialog - 是否显示成功对话框
     * @returns {Promise<boolean>}
     */
    async saveAsFile(showSuccessDialog = true) {
        console.log('saveAsFile 方法被调用, showSuccessDialog:', showSuccessDialog);
        try {
            const ujsonData = await this.generateUJson();
            console.log('生成的UJson数据长度:', ujsonData.length);
            
            console.log('打开另存为对话框');
            const filePath = await invoke()('save_ujson_file_as', { content: ujsonData });
            console.log('用户选择的文件路径:', filePath);

            if (!filePath) {
                console.log('用户取消了另存为，返回false');
                return false;
            }

            this.editor.sceneManager.markSceneSaved(filePath);
            
            if (showSuccessDialog) {
                DialogManager.showSaveSuccessDialog(filePath, true);
            }
            
            console.log('场景另存为完成，返回true');
            return true;
        } catch (error) {
            console.error('另存为场景失败:', error);
            if (error === "用户取消了保存操作") {
                console.log('用户取消了保存操作');
                return false;
            } else {
                alert('另存为场景失败: ' + error);
                return false;
            }
        }
    }

    /**
     * 导入文件
     * @returns {Promise<boolean>}
     */
    async importFile() {
        console.log('importFile 方法被调用');
        
        try {
            // 调用 Tauri 的文件选择对话框
            const filePath = await invoke()('import_file');
            console.log('用户选择的导入文件路径:', filePath);
            
            if (!filePath) {
                console.log('用户取消了文件选择');
                return false;
            }
            
            // 检查文件扩展名
            const fileExt = filePath.toLowerCase().split('.').pop();
            if (fileExt !== 'json' && fileExt !== 'ujson') {
                DialogManager.showErrorDialog('只支持导入 .json 和 .ujson 文件');
                return false;
            }
            
            // 读取文件内容
            const fileContent = await invoke()('read_file_content', { filePath: filePath });
            
            if (fileExt === 'json') {
                // 处理 JSON 文件
                await this.importJsonFile(fileContent);
            } else {
                // 处理 UJSON 文件
                await this.importUJsonFile(fileContent);
            }
            
            console.log('文件导入成功');
            return true;
        } catch (error) {
            console.error('导入文件失败:', error);
            if (!error.toString().includes('用户取消了文件选择')) {
                DialogManager.showErrorDialog('导入文件失败: ' + error);
            }
            return false;
        }
    }

    /**
     * 导入 JSON 文件
     * @param {string} fileContent - 文件内容
     */
    async importJsonFile(fileContent) {
        try {
            const jsonData = JSON.parse(fileContent);
            await this.editor.jsonHandler.importJsonData(jsonData);
            this.editor.sceneManager.markSceneDirty();
            // 不在这里调用autoArrangeNodes，因为nodeManager还没有这个方法
            console.log('JSON 文件导入成功');
        } catch (error) {
            console.error('解析 JSON 文件失败:', error);
            DialogManager.showErrorDialog('解析 JSON 文件失败: ' + error);
        }
    }

    /**
     * 导入 UJSON 文件
     * @param {string} fileContent - 文件内容
     */
    async importUJsonFile(fileContent) {
        try {
            const ujsonData = JSON.parse(fileContent);
            await this.loadFromUJson(ujsonData);
            this.editor.sceneManager.markSceneDirty();
            // 不在这里调用autoArrangeNodes，因为nodeManager还没有这个方法
            console.log('UJSON 文件导入成功');
        } catch (error) {
            console.error('解析 UJSON 文件失败:', error);
            DialogManager.showErrorDialog('解析 UJSON 文件失败: ' + error);
        }
    }

    /**
     * 浏览输出路径
     * @param {number} nodeId - 节点ID
     */
    async browseOutputPath(nodeId) {
        try {
            const filePath = await invoke()('browse_json_save_path');
            
            if (filePath && filePath.trim() !== '') {
                this.editor.nodeManager.updateNodeData(nodeId, 'outputPath', filePath.trim());
                
                const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
                if (nodeEl) {
                    const pathInput = nodeEl.querySelector('.path-input');
                    if (pathInput) {
                        pathInput.value = filePath.trim();
                    }
                }
                
                console.log('Output file path set:', filePath.trim());
            }
        } catch (error) {
            console.error('选择文件路径失败:', error);
            if (!error.toString().includes('用户取消了文件选择')) {
                DialogManager.showErrorDialog('选择文件路径失败: ' + error);
            }
        }
    }

    /**
     * 导出JSON
     * @param {number} nodeId - 输出节点ID
     */
    exportJson(nodeId) {
        try {
            let outputNode;
            if (nodeId) {
                outputNode = this.editor.nodes.get(nodeId);
                if (!outputNode || outputNode.type !== 'output') {
                    DialogManager.showErrorDialog('指定的节点不是输出节点。');
                    return;
                }
            } else {
                const outputNodes = Array.from(this.editor.nodes.values()).filter(node => 
                    node.type === 'output'
                );
                
                if (outputNodes.length === 0) {
                    DialogManager.showErrorDialog('没有找到输出节点，请先添加一个输出节点。');
                    return;
                } else if (outputNodes.length === 1) {
                    outputNode = outputNodes[0];
                } else {
                    DialogManager.showErrorDialog('存在多个输出节点，请点击特定输出节点上的导出按钮。');
                    return;
                }
            }
            
            const outputPath = outputNode.data.outputPath?.trim();
            if (!outputPath) {
                DialogManager.showErrorDialog('请先设置输出文件路径。');
                return;
            }
            
            const connectedNode = this.editor.jsonHandler.getConnectedInputNode(outputNode, '输入');
            if (!connectedNode) {
                DialogManager.showErrorDialog('输出节点没有连接任何数据，请将其他节点连接到输出节点。');
                return;
            }
            
            const jsonData = this.editor.jsonHandler.nodeToJson(connectedNode);
            const jsonString = JSON.stringify(jsonData, null, 2);
            
            invoke()('save_json_to_path', { 
                filePath: outputPath,
                content: jsonString 
            }).then(() => {
                console.log('JSON exported successfully to:', outputPath);
                DialogManager.showExportSuccessDialog(outputPath);
            }).catch((error) => {
                console.error('导出JSON失败:', error);
                DialogManager.showErrorDialog('导出JSON失败：' + error);
            });
        } catch (error) {
            console.error('导出JSON失败:', error);
            DialogManager.showErrorDialog('导出JSON失败：' + error);
        }
    }

    /**
     * 生成UJson格式的场景数据
     * @returns {string}
     */
    generateUJson() {
        const data = {
            version: "1.0.0",
            nodes: [],
            connections: []
        };
        
        // 导出节点数据
        this.editor.nodes.forEach(node => {
            const nodeData = {
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                data: node.data
            };
            
            if (node.type === 'array') {
                nodeData.inputCount = node.inputs.length;
            } else if (node.type === 'object') {
                nodeData.keys = node.inputs.map((input, index) => {
                    return node.data.keys ? (node.data.keys[input] || input) : input;
                });
            }
            
            data.nodes.push(nodeData);
        });
        
        // 导出连接数据
        this.editor.connections.forEach(connection => {
            const toNode = this.editor.nodes.get(connection.to.nodeId);
            
            const connData = {
                id: connection.id,
                from: {
                    nodeId: connection.from.nodeId,
                    socket: "output"
                },
                to: {
                    nodeId: connection.to.nodeId
                }
            };
            
            if (toNode) {
                if (toNode.type === 'array') {
                    const socketName = connection.to.socket;
                    const index = parseInt(socketName.replace('item', ''));
                    connData.to.socket = isNaN(index) ? 0 : index;
                } else if (toNode.type === 'object') {
                    const socketName = connection.to.socket;
                    const keyName = toNode.data.keys ? (toNode.data.keys[socketName] || socketName) : socketName;
                    connData.to.socket = keyName;
                } else if (toNode.type === 'output') {
                    connData.to.socket = "input";
                } else {
                    connData.to.socket = connection.to.socket;
                }
            } else {
                connData.to.socket = connection.to.socket;
            }
            
            data.connections.push(connData);
        });
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * 从UJson数据加载场景
     * @param {Object} ujsonData - UJson格式的数据对象
     */
    async loadFromUJson(ujsonData) {
        try {
            const data = ujsonData;
            
            await this.editor.clearAll();
            
            // 不再需要重置nodeIdCounter，因为使用UUID
            this.editor.connectionIdCounter = 1;
            
            // 加载节点
            if (data.nodes) {
                data.nodes.forEach(nodeData => {
                    let inputs, outputs;
                    
                    if (nodeData.type === 'array') {
                        const count = nodeData.inputCount || 5;
                        inputs = [];
                        for (let i = 0; i < count; i++) {
                            inputs.push(`item${i}`);
                        }
                    } else if (nodeData.type === 'object') {
                        if (nodeData.keys && Array.isArray(nodeData.keys)) {
                            inputs = nodeData.keys.map((key, index) => `input${index}`);
                            if (!nodeData.data.keys) {
                                nodeData.data.keys = {};
                            }
                            nodeData.keys.forEach((key, index) => {
                                nodeData.data.keys[`input${index}`] = key;
                            });
                        } else {
                            inputs = nodeData.inputs || this.editor.nodeManager.getNodeInputs(nodeData.type);
                        }
                    } else {
                        inputs = nodeData.inputs || this.editor.nodeManager.getNodeInputs(nodeData.type);
                    }
                    
                    outputs = nodeData.outputs || this.editor.nodeManager.getNodeOutputs(nodeData.type);
                    
                    const node = {
                        id: nodeData.id,
                        type: nodeData.type,
                        x: nodeData.x,
                        y: nodeData.y,
                        data: nodeData.data,
                        inputs: inputs,
                        outputs: outputs
                    };
                    
                    this.editor.nodes.set(node.id, node);
                    this.editor.nodeManager.createNodeElement(node);
                    
                    // 不再需要更新nodeIdCounter，因为使用UUID
                });
            }
            
            // 加载连接
            if (data.connections) {
                data.connections.forEach(connData => {
                    const toNode = this.editor.nodes.get(connData.to.nodeId);
                    
                    let fromSocket = connData.from.socket;
                    let toSocket = connData.to.socket;
                    
                    if (fromSocket === "output") {
                        fromSocket = "输出";
                    }
                    
                    if (toNode) {
                        if (toNode.type === 'array' && typeof toSocket === 'number') {
                            toSocket = `item${toSocket}`;
                        } else if (toNode.type === 'object' && typeof toSocket === 'string') {
                            if (toNode.data.keys) {
                                for (const [inputKey, keyName] of Object.entries(toNode.data.keys)) {
                                    if (keyName === toSocket) {
                                        toSocket = inputKey;
                                        break;
                                    }
                                }
                            }
                        } else if (toNode.type === 'output' && toSocket === "input") {
                            toSocket = "输入";
                        }
                    }
                    
                    const connection = {
                        id: connData.id,
                        from: {
                            nodeId: connData.from.nodeId,
                            socket: fromSocket
                        },
                        to: {
                            nodeId: connData.to.nodeId,
                            socket: toSocket
                        }
                    };
                    
                    this.editor.connections.set(connection.id, connection);
                    this.editor.connectionManager.drawConnection(connection);
                    
                    if (connection.id >= this.editor.connectionIdCounter) {
                        this.editor.connectionIdCounter = connection.id + 1;
                    }
                });
            }
            
            // 更新所有object节点的输入框样式
            this.editor.nodes.forEach(node => {
                if (node.type === 'object') {
                    this.editor.nodeManager.updateObjectInputStyles(node);
                    this.editor.nodeManager.checkObjectDuplicateKeys(node);
                }
            });
            
            this.editor.jsonHandler.updateJsonPreview();
            
            console.log('UJson文件加载成功');
        } catch (error) {
            console.error('加载UJson文件失败:', error);
            alert('加载文件失败: ' + error.message);
        }
    }
}
