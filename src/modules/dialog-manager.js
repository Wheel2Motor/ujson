/**
 * 对话框管理模块
 * 负责显示各种对话框和弹窗
 */
export class DialogManager {
    constructor() {
        // 静态类，不需要实例化
    }
    /**
     * 显示保存成功对话框
     * @param {string} filePath - 保存的文件路径
     * @param {boolean} isNewFile - 是否为新文件（另存为）
     */
    static showSaveSuccessDialog(filePath, isNewFile = false) {
        const dialog = document.getElementById('save-success-dialog');
        const title = document.getElementById('dialog-title');
        const message = document.getElementById('dialog-message');
        const pathElement = document.getElementById('dialog-path');
        const closeBtn = document.getElementById('dialog-close-btn');

        // 设置对话框内容
        if (isNewFile) {
            title.textContent = '另存为成功';
            message.textContent = '文件已成功另存为：';
        } else {
            title.textContent = '保存成功';
            message.textContent = '文件已成功保存：';
        }
        
        pathElement.textContent = filePath;
        pathElement.style.display = 'block';

        // 绑定关闭按钮事件
        const closeHandler = () => {
            dialog.close();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);

        // 显示对话框
        dialog.showModal();

        // 点击背景关闭对话框
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.close();
            }
        });
    }

    /**
     * 显示导出成功对话框
     * @param {string} filePath - 导出的文件路径
     */
    static showExportSuccessDialog(filePath) {
        const dialog = document.getElementById('save-success-dialog');
        const title = document.getElementById('dialog-title');
        const message = document.getElementById('dialog-message');
        const pathElement = document.getElementById('dialog-path');
        const closeBtn = document.getElementById('dialog-close-btn');

        // 设置对话框内容
        title.textContent = '导出成功';
        message.textContent = 'JSON已成功导出到：';
        pathElement.textContent = filePath;
        pathElement.style.display = 'block';

        // 绑定关闭按钮事件
        const closeHandler = () => {
            dialog.close();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);

        // 显示对话框
        dialog.showModal();

        // 点击背景关闭对话框
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.close();
            }
        });
    }

    /**
     * 显示错误对话框
     * @param {string} errorMessage - 错误信息
     */
    static showErrorDialog(errorMessage) {
        const dialog = document.getElementById('save-success-dialog');
        const title = document.getElementById('dialog-title');
        const message = document.getElementById('dialog-message');
        const pathElement = document.getElementById('dialog-path');
        const closeBtn = document.getElementById('dialog-close-btn');

        // 设置对话框内容
        title.textContent = '导出失败';
        message.textContent = errorMessage;
        pathElement.textContent = '';
        pathElement.style.display = 'none';

        // 绑定关闭按钮事件
        const closeHandler = () => {
            dialog.close();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);

        // 显示对话框
        dialog.showModal();

        // 点击背景关闭对话框
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.close();
            }
        });
    }

    /**
     * 显示打开新场景前的确认对话框
     * @returns {Promise<string>} - 用户选择：'保存' | '丢弃' | '取消'
     */
    static showOpenSceneConfirmDialog() {
        return new Promise((resolve) => {
            const dialog = document.getElementById('scene-confirm-dialog');
            const saveBtn = document.getElementById('confirm-save-exit-btn');
            const discardBtn = document.getElementById('confirm-discard-exit-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');

            // 清理之前的事件监听器
            const newSaveBtn = saveBtn.cloneNode(true);
            const newDiscardBtn = discardBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);

            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            discardBtn.parentNode.replaceChild(newDiscardBtn, discardBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 创建一个一次性的事件处理器
            const handleChoice = (choice) => {
                // 隐藏对话框和backdrop
                dialog.style.display = 'none';
                backdrop.style.display = 'none';
                resolve(choice);
            };

            // 设置按钮文本 - 打开场景前只显示"保存"和"丢弃"
            newSaveBtn.textContent = '保存';
            newDiscardBtn.textContent = '丢弃';

            // 绑定事件（每次重新绑定，避免重复绑定）
            newSaveBtn.onclick = () => handleChoice('save');
            newDiscardBtn.onclick = () => handleChoice('discard');
            newCancelBtn.onclick = () => handleChoice('cancel');

            // 键盘事件 - ESC关闭
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleChoice('cancel');
                }
            };

            // 创建或获取backdrop
            let backdrop = document.getElementById('scene-confirm-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'scene-confirm-backdrop';
                backdrop.className = 'modal-backdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(backdrop);
            }

            // 显示对话框 - 将dialog放到backdrop中
            dialog.style.display = 'block';
            dialog.style.position = 'fixed';
            dialog.style.zIndex = '9999';

            // 监听键盘事件
            dialog.addEventListener('keydown', keydownHandler);

            // 监听backdrop点击
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    handleChoice('cancel');
                }
            }, { once: true });
        });
    }

    /**
     * 显示新建文件前的确认对话框
     * @returns {Promise<string>} - 用户选择：'save' | 'discard' | 'cancel'
     */
    static showNewFileConfirmDialog() {
        return new Promise((resolve) => {
            const dialog = document.getElementById('scene-confirm-dialog');
            const saveBtn = document.getElementById('confirm-save-exit-btn');
            const discardBtn = document.getElementById('confirm-discard-exit-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');

            // 清理之前的事件监听器
            const newSaveBtn = saveBtn.cloneNode(true);
            const newDiscardBtn = discardBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);

            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            discardBtn.parentNode.replaceChild(newDiscardBtn, discardBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 创建一个一次性的事件处理器
            const handleChoice = (choice) => {
                // 隐藏对话框和backdrop
                dialog.style.display = 'none';
                backdrop.style.display = 'none';
                resolve(choice);
            };

            // 设置按钮文本 - 新建文件前显示"保存"、"不保存"和"取消"
            newSaveBtn.textContent = '保存';
            newDiscardBtn.textContent = '不保存';

            // 绑定事件（每次重新绑定，避免重复绑定）
            newSaveBtn.onclick = () => handleChoice('save');
            newDiscardBtn.onclick = () => handleChoice('discard');
            newCancelBtn.onclick = () => handleChoice('cancel');

            // 键盘事件 - ESC关闭
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleChoice('cancel');
                }
            };

            // 创建或获取backdrop
            let backdrop = document.getElementById('scene-confirm-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'scene-confirm-backdrop';
                backdrop.className = 'modal-backdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(backdrop);
            }

            // 显示对话框 - 将dialog放到backdrop中
            dialog.style.display = 'block';
            dialog.style.position = 'fixed';
            dialog.style.zIndex = '9999';

            // 监听键盘事件
            dialog.addEventListener('keydown', keydownHandler);

            // 监听backdrop点击
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    handleChoice('cancel');
                }
            }, { once: true });
        });
    }

    /**
     * 显示关闭窗口前的确认对话框
     * @returns {Promise<string>} - 用户选择：'save' | 'discard' | 'cancel'
     */
    static showCloseWindowConfirmDialog() {
        return new Promise((resolve) => {
            const dialog = document.getElementById('scene-confirm-dialog');
            const saveBtn = document.getElementById('confirm-save-exit-btn');
            const discardBtn = document.getElementById('confirm-discard-exit-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');

            // 清理之前的事件监听器
            const newSaveBtn = saveBtn.cloneNode(true);
            const newDiscardBtn = discardBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);

            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            discardBtn.parentNode.replaceChild(newDiscardBtn, discardBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            // 创建一个一次性的事件处理器
            const handleChoice = (choice) => {
                // 隐藏对话框和backdrop
                dialog.style.display = 'none';
                backdrop.style.display = 'none';
                resolve(choice);
            };

            // 设置按钮文本 - 关闭窗口前显示"保存并退出"和"丢弃并退出"
            saveBtn.textContent = '保存并退出';
            discardBtn.textContent = '丢弃并退出';

            // 绑定事件（每次重新绑定，避免重复绑定）
            newSaveBtn.onclick = () => handleChoice('save');
            newDiscardBtn.onclick = () => handleChoice('discard');
            newCancelBtn.onclick = () => handleChoice('cancel');

            // 键盘事件 - ESC关闭
            const keydownHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    handleChoice('cancel');
                }
            };

            // 创建或获取backdrop
            let backdrop = document.getElementById('scene-confirm-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'scene-confirm-backdrop';
                backdrop.className = 'modal-backdrop';
                backdrop.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(backdrop);
            }

            // 显示对话框 - 将dialog放到backdrop中
            dialog.style.display = 'block';
            dialog.style.position = 'fixed';
            dialog.style.zIndex = '9999';

            // 监听键盘事件
            dialog.addEventListener('keydown', keydownHandler);

            // 监听backdrop点击
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    handleChoice('cancel');
                }
            }, { once: true });
        });
    }
}