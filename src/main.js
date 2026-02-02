/**
 * UJson Editor - 主入口文件
 * 节点式JSON编辑器
 */

import { DialogManager } from './modules/dialog-manager.js';
import { SceneManager } from './modules/scene-manager.js';
import { ContextMenuManager } from './modules/context-menu.js';
import { SelectionManager } from './modules/selection-manager.js';
import { FileManager } from './modules/file-manager.js';
import { NodeManager } from './modules/node-manager.js';
import { ConnectionManager } from './modules/connection-manager.js';
import { CanvasHandler } from './modules/canvas-handler.js';
import { JsonHandler } from './modules/json-handler.js';

/**
 * UJson编辑器主类
 */
class UJsonEditor {
    constructor() {
        // 核心数据
        this.nodes = new Map();
        this.connections = new Map();
        // 不再需要nodeIdCounter，因为使用UUID
        this.connectionIdCounter = 1;

        // DOM元素
        this.canvas = null;
        this.nodesLayer = null;
        this.connectionsLayer = null;

        // 初始化各个管理模块
        this.sceneManager = new SceneManager();
        this.contextMenuManager = new ContextMenuManager(this);
        this.selectionManager = new SelectionManager(this);
        this.fileManager = new FileManager(this);
        this.nodeManager = new NodeManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.canvasHandler = new CanvasHandler(this);
        this.jsonHandler = new JsonHandler(this);

        // 窗口面板状态
        this.windowState = {
            jsonPreview: true,
            nodeProperties: true
        };

        // 设置选择管理器的回调
        this.selectionManager.onNodeSelected = (node) => {
            if (this.nodeManager.isPropertiesTabVisible()) {
                this.nodeManager.updateNodeProperties(node);
            }
            this.jsonHandler.updateJsonPreview();
        };

        this.selectionManager.onNodeDeselected = () => {
            if (this.nodeManager.isPropertiesTabVisible()) {
                this.nodeManager.clearNodeProperties();
            }
            this.jsonHandler.updateJsonPreview();
        };
    }

    /**
     * 初始化编辑器
     */
    init() {
        console.log('UJsonEditor init() called');

        this.canvas = document.getElementById('canvas');
        this.nodesLayer = document.getElementById('nodes');
        this.connectionsLayer = document.getElementById('connections');

        if (!this.canvas || !this.nodesLayer || !this.connectionsLayer) {
            console.error('Failed to find required DOM elements');
            return;
        }

        this.bindEvents();
        this.jsonHandler.updateJsonPreview();
        this.canvasHandler.updateCanvasTransform();
        this.canvasHandler.initializeSVG();
        this.contextMenuManager.initialize();
        this.initializeKeyboardEvents();
        this.sceneManager.updateWindowTitle();
        this.sceneManager.setupCloseHandler(() => this.handleCloseRequest());
        this.initializeWindowMenu();

        console.log('UJson Editor initialized successfully');
    }

    /**
     * 初始化键盘事件
     */
    initializeKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Alt+S 另存为 - 全局生效（避开 WebView2 的 Ctrl+Shift+S 截图快捷键）
            if (e.ctrlKey && e.altKey && e.key === 's') {
                e.preventDefault();
                this.fileManager.saveAsFile();
                return;
            }

            // Ctrl+S 保存 - 全局生效
            if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 's') {
                e.preventDefault();
                this.fileManager.saveFile();
                return;
            }

            // Ctrl+N 新建 - 全局生效
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.newFile();
                return;
            }

            // Ctrl+O 打开 - 全局生效
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                this.fileManager.openFile();
                return;
            }

            // Ctrl+A 选中所有节点 - 全局生效
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                const activeElement = document.activeElement;
                if (activeElement && (
                    activeElement.tagName.toLowerCase() === 'input' ||
                    activeElement.tagName.toLowerCase() === 'textarea' ||
                    activeElement.tagName.toLowerCase() === 'select'
                )) {
                    return; // 在输入框中不触发
                }
                this.selectionManager.selectAllNodes(this.nodes);
                return;
            }

            // F键 - 跳转到选中节点中心或回到原点
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                const activeElement = document.activeElement;
                if (activeElement && (
                    activeElement.tagName.toLowerCase() === 'input' ||
                    activeElement.tagName.toLowerCase() === 'textarea' ||
                    activeElement.tagName.toLowerCase() === 'select'
                )) {
                    return; // 在输入框中不触发
                }

                this.canvasHandler.focusOnSelectedNodesOrOrigin();
                return;
            }

            const activeElement = document.activeElement;
            if (activeElement && (
                activeElement.tagName.toLowerCase() === 'input' ||
                activeElement.tagName.toLowerCase() === 'textarea' ||
                activeElement.tagName.toLowerCase() === 'select'
            )) {
                return;
            }
            
            if (e.key === 'Delete') {
                e.preventDefault();
                if (this.selectionManager.selectedNodes.size > 0) {
                    this.selectionManager.deleteSelectedNodes((nodeId) => this.nodeManager.deleteNode(nodeId));
                    this.jsonHandler.updateJsonPreview();
                    this.sceneManager.markSceneDirty();
                } else if (this.selectionManager.selectedNode) {
                    this.nodeManager.deleteNode(this.selectionManager.selectedNode.id);
                }
            }
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.bindMenuEvents();
        
        // 工具栏按钮
        document.getElementById('add-object')?.addEventListener('click', () => this.nodeManager.addNode('object'));
        document.getElementById('add-array')?.addEventListener('click', () => this.nodeManager.addNode('array'));
        document.getElementById('add-string')?.addEventListener('click', () => this.nodeManager.addNode('string'));
        document.getElementById('add-number')?.addEventListener('click', () => this.nodeManager.addNode('number'));
        document.getElementById('add-boolean')?.addEventListener('click', () => this.nodeManager.addNode('boolean'));
        document.getElementById('add-null')?.addEventListener('click', () => this.nodeManager.addNode('null'));
        document.getElementById('add-output')?.addEventListener('click', () => this.nodeManager.addNode('output'));
        document.getElementById('clear-all')?.addEventListener('click', () => this.clearAll());
        document.getElementById('reset-view')?.addEventListener('click', () => this.canvasHandler.resetView());
        
        // 缩放滑块
        document.getElementById('zoom-slider')?.addEventListener('input', (e) => {
            this.canvasHandler.setScale(parseFloat(e.target.value) / 100);
        });

        // Tab切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.canvasHandler.switchTab(e.target.dataset.tab));
        });

        // 画布事件
        this.canvas.addEventListener('mousedown', (e) => this.canvasHandler.onCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.canvasHandler.onCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.canvasHandler.onCanvasMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.canvasHandler.onCanvasClick(e));
        this.canvas.addEventListener('wheel', (e) => this.canvasHandler.onCanvasWheel(e));
        
        // 画布空白处右键菜单 - 绑定到 nodesLayer（它覆盖在 canvas 上方）
        this.nodesLayer.addEventListener('contextmenu', (e) => this.onCanvasContextMenu(e));
        this.canvas.addEventListener('contextmenu', (e) => this.onCanvasContextMenu(e));
    }

    /**
     * 绑定菜单事件
     */
    bindMenuEvents() {
        const appMenuBtn = document.getElementById('app-menu-btn');
        const fileDropdown = document.getElementById('file-dropdown');
        this.submenuTimeout = null;
        this.currentSubmenu = null;

        if (appMenuBtn && fileDropdown) {
            appMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileDropdown.classList.toggle('show');
                appMenuBtn.classList.toggle('active');
                this.syncWindowMenuState();
            });

            document.addEventListener('click', () => {
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
                this.hideAllSubmenus();
            });

            // 文件子菜单项事件
            document.getElementById('new-file')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.newFile();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            document.getElementById('open-file')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileManager.openFile();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            document.getElementById('import-file')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileManager.importFile();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            document.getElementById('save-file')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileManager.saveFile();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            document.getElementById('save-as-file')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.fileManager.saveAsFile();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            // 窗口子菜单项事件
            document.getElementById('toggle-json-preview')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleJsonPreview();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            document.getElementById('toggle-node-properties')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNodeProperties();
                fileDropdown.classList.remove('show');
                appMenuBtn.classList.remove('active');
            });

            // 有子菜单的菜单项的事件处理
            this.setupSubmenuHover();
        }
    }

    /**
     * 设置子菜单的hover事件
     */
    setupSubmenuHover() {
        const submenuItems = document.querySelectorAll('.menu-option.has-submenu');

        submenuItems.forEach(item => {
            // 鼠标进入菜单项时，立即显示对应的子菜单
            item.addEventListener('mouseenter', (e) => {
                // 清除之前的延迟关闭
                if (this.submenuTimeout) {
                    clearTimeout(this.submenuTimeout);
                    this.submenuTimeout = null;
                }

                // 隐藏所有子菜单
                this.hideAllSubmenus();

                // 找到对应的子菜单
                const nextSibling = item.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('menu-submenu')) {
                    nextSibling.style.display = 'block';
                    this.currentSubmenu = nextSibling;
                }
            });

            // 鼠标离开菜单项时，延迟关闭子菜单
            item.addEventListener('mouseleave', (e) => {
                // 如果鼠标进入了子菜单，不要关闭
                if (e.relatedTarget && this.currentSubmenu && this.currentSubmenu.contains(e.relatedTarget)) {
                    return;
                }

                // 设置延迟关闭，给用户时间滑向子菜单
                this.submenuTimeout = setTimeout(() => {
                    if (this.currentSubmenu && !this.currentSubmenu.matches(':hover')) {
                        this.hideAllSubmenus();
                    }
                }, 100);
            });

            // 点击时不关闭下拉菜单
            item.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // 为所有子菜单添加鼠标事件
        const submenus = document.querySelectorAll('.menu-submenu');
        submenus.forEach(submenu => {
            // 鼠标进入子菜单，取消延迟关闭
            submenu.addEventListener('mouseenter', () => {
                if (this.submenuTimeout) {
                    clearTimeout(this.submenuTimeout);
                    this.submenuTimeout = null;
                }
            });

            // 鼠标离开子菜单，延迟关闭
            submenu.addEventListener('mouseleave', (e) => {
                this.submenuTimeout = setTimeout(() => {
                    this.hideAllSubmenus();
                }, 100);
            });
        });
    }

    /**
     * 隐藏所有子菜单
     */
    hideAllSubmenus() {
        const submenus = document.querySelectorAll('.menu-submenu');
        submenus.forEach(submenu => {
            submenu.style.display = 'none';
        });
        this.currentSubmenu = null;
    }

    /**
     * 初始化窗口菜单
     */
    initializeWindowMenu() {
        // 设置初始状态 - 默认只显示JSON预览
        this.windowState = {
            jsonPreview: true,
            nodeProperties: false
        };
        this.updateRightPanelVisibility();
    }

    /**
     * 同步窗口菜单状态
     */
    syncWindowMenuState() {
        const jsonPreviewToggle = document.getElementById('toggle-json-preview');
        const nodePropertiesToggle = document.getElementById('toggle-node-properties');

        if (jsonPreviewToggle) {
            jsonPreviewToggle.classList.toggle('checked', this.windowState.jsonPreview);
        }

        if (nodePropertiesToggle) {
            nodePropertiesToggle.classList.toggle('checked', this.windowState.nodeProperties);
        }
    }

    /**
     * 切换JSON预览显示
     */
    toggleJsonPreview() {
        this.windowState.jsonPreview = !this.windowState.jsonPreview;
        this.updateRightPanelVisibility();
    }

    /**
     * 切换节点属性显示
     */
    toggleNodeProperties() {
        this.windowState.nodeProperties = !this.windowState.nodeProperties;
        this.updateRightPanelVisibility();
    }

    /**
     * 更新右侧面板显示状态
     */
    updateRightPanelVisibility() {
        const rightPanel = document.querySelector('.right-panel');
        const jsonTabBtn = document.querySelector('.tab-btn[data-tab="json"]');
        const propertiesTabBtn = document.querySelector('.tab-btn[data-tab="properties"]');
        const jsonTabPanel = document.getElementById('json-tab');
        const propertiesTabPanel = document.getElementById('properties-tab');

        // 更新菜单项勾选状态
        this.syncWindowMenuState();

        // 控制Tab按钮显示/隐藏
        if (jsonTabBtn) {
            jsonTabBtn.style.display = this.windowState.jsonPreview ? 'block' : 'none';
        }

        if (propertiesTabBtn) {
            propertiesTabBtn.style.display = this.windowState.nodeProperties ? 'block' : 'none';
        }

        // 如果只显示一个tab，确保对应的tab-panel是active状态
        if (jsonTabPanel && propertiesTabPanel) {
            const jsonActive = jsonTabPanel.classList.contains('active');

            if (this.windowState.jsonPreview && !this.windowState.nodeProperties) {
                jsonTabPanel.classList.add('active');
                jsonTabBtn?.classList.add('active');
                propertiesTabPanel.classList.remove('active');
                propertiesTabBtn?.classList.remove('active');
            } else if (!this.windowState.jsonPreview && this.windowState.nodeProperties) {
                propertiesTabPanel.classList.add('active');
                propertiesTabBtn?.classList.add('active');
                jsonTabPanel.classList.remove('active');
                jsonTabBtn?.classList.remove('active');
            }
        }

        // 当两个都隐藏时，隐藏整个右侧面板
        if (rightPanel) {
            const anyVisible = this.windowState.jsonPreview || this.windowState.nodeProperties;
            rightPanel.style.display = anyVisible ? 'flex' : 'none';
        }
    }

    /**
     * 处理窗口关闭请求
     */
    /**
     * 新建文件
     */
    async newFile() {
        if (!this.sceneManager.isSceneDirty) {
            // 场景不脏，直接新建
            this.createNewScene();
            return;
        }

        // 场景脏，询问用户
        try {
            const userChoice = await DialogManager.showNewFileConfirmDialog();
            
            switch (userChoice) {
                case 'save':
                    // 先保存，然后新建
                    let saveResult = false;
                    try {
                        if (!this.sceneManager.currentFilePath || !this.sceneManager.hasBeenSaved) {
                            saveResult = await this.fileManager.saveAsFile(false);
                        } else {
                            saveResult = await this.fileManager.saveFile(false);
                        }

                        if (saveResult) {
                            this.createNewScene();
                        }
                    } catch (error) {
                        console.error('保存过程中出错:', error);
                    }
                    break;
                    
                case 'discard':
                    // 不保存，直接新建
                    this.createNewScene();
                    break;
            }
        } catch (error) {
            console.error('处理新建文件请求时出错:', error);
        }
    }

    /**
     * 创建新场景
     */
    createNewScene() {
        // 清除场景关联的ujson文件
        this.sceneManager.currentFilePath = null;
        this.sceneManager.isSceneDirty = false;
        this.sceneManager.hasBeenSaved = false;
        this.sceneManager.isCleanScene = true;
        
        // 清空场景
        this.clearAll();
        
        // 更新窗口标题
        this.sceneManager.updateWindowTitle();
    }

    async handleCloseRequest() {
        if (this.sceneManager.isClosing) return;

        if (!this.sceneManager.isSceneDirty) {
            this.sceneManager.isClosing = true;
            await this.sceneManager.closeApplication();
            return;
        }

        try {
            const userChoice = await DialogManager.showCloseWindowConfirmDialog();
            
            switch (userChoice) {
                case 'save':
                    this.sceneManager.isClosing = true;
                    let saveResult = false;
                    try {
                        if (!this.sceneManager.currentFilePath || !this.sceneManager.hasBeenSaved) {
                            // 保存并退出，不显示成功对话框
                            saveResult = await this.fileManager.saveAsFile(false);
                        } else {
                            // 保存并退出，不显示成功对话框
                            saveResult = await this.fileManager.saveFile(false);
                        }

                        if (saveResult) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                            await this.sceneManager.closeApplication();
                        } else {
                            this.sceneManager.isClosing = false;
                        }
                    } catch (error) {
                        console.error('保存过程中出错:', error);
                        this.sceneManager.isClosing = false;
                    }
                    break;
                    
                case 'discard':
                    this.sceneManager.isClosing = true;
                    await this.sceneManager.closeApplication();
                    break;
            }
        } catch (error) {
            console.error('处理关闭请求时出错:', error);
            this.sceneManager.isClosing = false;
        }
    }

    /**
     * 检查场景状态并处理变更
     */
    async checkSceneStateBeforeAction(action, isClosingWindow = false) {
        if (!this.sceneManager.isSceneDirty) {
            return await action();
        }

        const userChoice = isClosingWindow 
            ? await DialogManager.showCloseWindowConfirmDialog()
            : await DialogManager.showOpenSceneConfirmDialog();
        
            switch (userChoice) {
                case 'save':
                    try {
                        if (!this.sceneManager.currentFilePath || !this.sceneManager.hasBeenSaved) {
                            await this.fileManager.saveAsFile(false);
                        } else {
                            await this.fileManager.saveFile(false);
                        }
                        return await action();
                } catch (error) {
                    console.error('保存失败:', error);
                    return false;
                }
            case 'discard':
                return await action();
            default:
                return false;
        }
    }

    /**
     * 清空所有
     */
    clearAll() {
        this.nodes.clear();
        this.connections.clear();
        // 不再需要重置nodeIdCounter，因为使用UUID
        this.connectionIdCounter = 1;
        this.selectionManager.selectedNode = null;
        this.selectionManager.clearMultiSelection();
        
        this.nodesLayer.innerHTML = '';
        this.connectionsLayer.innerHTML = '';
        
        this.jsonHandler.updateJsonPreview();
        this.nodeManager.clearNodeProperties();
        
        if (!this.sceneManager.isCleanScene || this.nodes.size > 0 || this.connections.size > 0) {
            this.sceneManager.markSceneDirty();
        }
    }

    /**
     * 画布右键菜单事件
     * @param {MouseEvent} e - 鼠标事件
     */
    onCanvasContextMenu(e) {
        e.preventDefault();
        
        // 检查点击的是否是画布空白处（不是节点或其他交互元素）
        const target = e.target;
        const isCanvasArea = target === this.canvas || 
                             target === this.nodesLayer || 
                             target === this.connectionsLayer ||
                             (target.closest('#canvas') && !target.closest('.node'));
        
        if (isCanvasArea) {
            // 检查是否有选中的节点
            const hasSelectedNode = this.selectionManager.selectedNode !== null;
            const hasMultiSelectedNodes = this.selectionManager.selectedNodes.size > 0;
            
            // 显示画布右键菜单（无论是否有选中节点）
            this.contextMenuManager.show(e.clientX, e.clientY, {
                isCanvasMenu: true,
                isNode: true,
                hasSelection: hasSelectedNode || hasMultiSelectedNodes,
                nodeId: hasSelectedNode ? this.selectionManager.selectedNode.id : null
            });
        }
    }
}

// 初始化编辑器
let editor;
window.addEventListener("DOMContentLoaded", () => {
    editor = new UJsonEditor();
    editor.init();
    window.editor = editor;
});
