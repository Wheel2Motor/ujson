/**
 * 右键菜单模块
 * 负责右键菜单的初始化和显示
 */

export class ContextMenuManager {
    constructor(editor) {
        this.editor = editor;
        this.contextMenu = null;
        this.contextMenuTarget = null;
    }

    /**
     * 初始化右键菜单
     */
    initialize() {
        this.contextMenu = document.getElementById('context-menu');

        // 点击排序菜单项
        const sortNodesItem = document.getElementById('sort-nodes');
        console.log('排序菜单项元素:', sortNodesItem);

        if (sortNodesItem) {
            sortNodesItem.addEventListener('click', (e) => {
                console.log('排序按钮被点击');
                console.log('是否禁用:', e.currentTarget.classList.contains('disabled'));
                console.log('contextMenuTarget:', this.contextMenuTarget);

                // 如果是禁用状态，不执行操作
                if (e.currentTarget.classList.contains('disabled')) {
                    console.log('排序功能被禁用');
                    return;
                }

                // 只要有选中的节点，就可以排序（无论是画布还是节点上右键）
                console.log('调用sortSelectedNodes');
                this.editor.nodeManager.sortSelectedNodes();

                this.hide();
            });
        } else {
            console.error('找不到排序菜单项元素');
        }

        // 点击删除socket菜单项
        document.getElementById('delete-socket').addEventListener('click', () => {
            if (this.contextMenuTarget) {
                this.editor.nodeManager.deleteArrayInput(this.contextMenuTarget);
            }
            this.hide();
        });

        // 点击断开连接菜单项
        document.getElementById('disconnect-socket').addEventListener('click', () => {
            if (this.contextMenuTarget) {
                this.editor.connectionManager.disconnectSocket(this.contextMenuTarget);
            }
            this.hide();
        });

        // 点击删除节点菜单项
        document.getElementById('delete-node').addEventListener('click', (e) => {
            // 如果是禁用状态，不执行操作
            if (e.currentTarget.classList.contains('disabled')) {
                return;
            }

            if (this.contextMenuTarget) {
                // 如果是从画布空白处触发的菜单，删除所有选中的节点
                if (this.contextMenuTarget.isCanvasMenu) {
                    // 先删除多选的节点
                    if (this.editor.selectionManager.selectedNodes.size > 0) {
                        this.editor.selectionManager.deleteSelectedNodes((nodeId) => {
                            this.editor.nodeManager.deleteNode(nodeId);
                        });
                    }
                    // 再删除单选的节点
                    else if (this.editor.selectionManager.selectedNode) {
                        this.editor.nodeManager.deleteNode(this.editor.selectionManager.selectedNode.id);
                    }
                } else if (this.contextMenuTarget.nodeId) {
                    // 从节点上触发的菜单，只删除该节点
                    this.editor.nodeManager.deleteNode(this.contextMenuTarget.nodeId);
                }
            }
            this.hide();
        });

        // 点击其他地方隐藏菜单
        document.addEventListener('click', () => {
            this.hide();
        });

        // 阻止右键菜单的默认行为
        this.contextMenu.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    /**
     * 显示右键菜单
     * @param {number} x - 屏幕X坐标
     * @param {number} y - 屏幕Y坐标
     * @param {Object} target - 目标对象信息
     */
    show(x, y, target) {
        this.contextMenuTarget = target;

        // 检查是否有选中的节点
        const hasSelection =
            this.editor.selectionManager.selectedNodes.size > 0 ||
            this.editor.selectionManager.selectedNode !== null;

        // 根据目标类型显示不同的菜单项
        const sortNodesItem = document.getElementById('sort-nodes');
        const deleteSocketItem = document.getElementById('delete-socket');
        const disconnectSocketItem = document.getElementById('disconnect-socket');
        const deleteNodeItem = document.getElementById('delete-node');

        // 默认隐藏所有菜单项
        sortNodesItem.style.display = 'none';
        deleteSocketItem.style.display = 'none';
        disconnectSocketItem.style.display = 'none';
        deleteNodeItem.style.display = 'none';

        if (target.isNode) {
            // 节点/画布右键菜单：显示排序和删除节点选项
            sortNodesItem.style.display = 'block';
            deleteNodeItem.style.display = 'flex';

            // 如果没有选中节点，禁用排序选项（删除节点选项仍然可用）
            if (!hasSelection) {
                sortNodesItem.classList.add('disabled');
                deleteNodeItem.classList.add('disabled');
            } else {
                sortNodesItem.classList.remove('disabled');
                deleteNodeItem.classList.remove('disabled');
            }
        } else {
            // Socket右键菜单
            if (target.isArraySocket || target.isObjectSocket) {
                // 数组或对象socket：显示删除插槽选项
                deleteSocketItem.style.display = 'block';
            }

            // 检查socket是否有连接
            const hasConnection = this.editor.connectionManager.socketHasConnection(target.nodeId, target.socketName, target.isInput);
            if (hasConnection) {
                disconnectSocketItem.style.display = 'block';
            }

            // 如果没有可用的socket菜单项，不显示菜单
            if (!target.isArraySocket && !target.isObjectSocket && !hasConnection) {
                return;
            }
        }

        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.style.display = 'block';
    }

    /**
     * 隐藏右键菜单
     */
    hide() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
    }
}
