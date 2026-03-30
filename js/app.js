/**
 * Nano EPUB Reader - Alpine.js 版本
 * 极简 PC 端 EPUB 阅读器
 */

document.addEventListener('alpine:init', () => {
    Alpine.data('epubReader', () => ({
        // ===== 状态 =====
        bookLoaded: false,
        book: null,
        rendition: null,
        bookTitle: '',
        
        // 章节
        spineItems: [],
        currentSpineIndex: 0,
        toc: [],
        
        // UI 状态
        dragOver: false,
        settingsOpen: false,
        
        // 设置
        theme: localStorage.getItem('nano-theme') || 'light',
        fontSize: parseInt(localStorage.getItem('nano-fontsize')) || 18,
        readerWidth: parseInt(localStorage.getItem('nano-width')) || 800,
        
        // 主题图标
        get themeIcon() {
            return { light: '☀', dark: '☾', sepia: '☕' }[this.theme];
        },
        
        // 阅读栏样式
        get viewerStyle() {
            return { maxWidth: this.readerWidth + 'px' };
        },
        
        // ===== 初始化 =====
        init() {
            this.$watch('theme', val => localStorage.setItem('nano-theme', val));
            this.$watch('fontSize', val => {
                localStorage.setItem('nano-fontsize', val);
                this.applyStyles();
            });
            this.$watch('readerWidth', val => {
                localStorage.setItem('nano-width', val);
                this.resizeViewer();
            });
        },
        
        // ===== 文件处理 =====
        handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) this.loadBook(file);
        },
        
        handleDrop(e) {
            this.dragOver = false;
            const file = e.dataTransfer.files[0];
            if (file?.name.toLowerCase().endsWith('.epub')) {
                this.loadBook(file);
            }
        },
        
        async loadBook(file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                this.book = ePub(arrayBuffer);
                await this.book.ready;
                
                this.spineItems = this.book.spine.spineItems || [];
                this.bookTitle = this.book.packaging?.metadata?.title || file.name.replace('.epub', '');
                
                // 解析目录
                const nav = await this.book.loaded.navigation;
                this.toc = this.parseToc(nav.toc || []);
                
                this.bookLoaded = true;
                
                // 加载第一章
                this.$nextTick(() => this.loadChapter(0));
                
            } catch (err) {
                console.error('加载失败:', err);
                alert('加载 EPUB 失败: ' + err.message);
            }
        },
        
        // ===== 目录处理 =====
        parseToc(toc, level = 0) {
            return toc.map(item => ({
                label: item.label,
                href: item.href,
                level,
                spineIndex: this.findSpineIndex(item.href),
                collapsed: level > 0, // 默认展开第一层
                children: item.subitems ? this.parseToc(item.subitems, level + 1) : []
            }));
        },
        
        findSpineIndex(href) {
            if (!href) return -1;
            const cleanHref = href.split('#')[0];
            return this.spineItems.findIndex(item => {
                return item.href === cleanHref || 
                       item.href.endsWith(cleanHref) || 
                       cleanHref.endsWith(item.href);
            });
        },
        
        toggleItem(item) {
            item.collapsed = !item.collapsed;
        },
        
        collapseAll() {
            this.toc.forEach(item => {
                item.collapsed = true;
                item.children.forEach(child => child.collapsed = true);
            });
        },
        
        expandAll() {
            this.toc.forEach(item => {
                item.collapsed = false;
                item.children.forEach(child => child.collapsed = false);
            });
        },
        
        // ===== 章节加载 =====
        async loadChapter(index) {
            if (index < 0 || index >= this.spineItems.length) return;
            
            this.currentSpineIndex = index;
            
            // 滚动到顶部
            this.$refs.readingArea.scrollTo({ top: 0, behavior: 'instant' });
            
            // 销毁旧的 rendition
            if (this.rendition) {
                this.rendition.destroy();
            }
            
            // 创建新的 rendition
            this.rendition = this.book.renderTo(this.$refs.viewer, {
                width: '100%',
                height: '100%',
                flow: 'scrolled-doc'
            });
            
            // 应用样式并显示
            this.applyStyles();
            await this.rendition.display(index);
        },
        
        prevChapter() {
            this.loadChapter(this.currentSpineIndex - 1);
        },
        
        nextChapter() {
            this.loadChapter(this.currentSpineIndex + 1);
        },
        
        // ===== 样式 & 主题 =====
        applyStyles() {
            if (!this.rendition) return;
            
            const colors = {
                light: { bg: '#fff', color: '#333' },
                dark: { bg: '#1a1a1a', color: '#ccc' },
                sepia: { bg: '#f4ecd8', color: '#5b4636' }
            }[this.theme];
            
            this.rendition.themes.register('custom', {
                body: {
                    'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    'font-size': `${this.fontSize}px`,
                    'line-height': '1.8',
                    'background': colors.bg,
                    'color': colors.color
                },
                '*': { 'max-width': '100%' },
                'img': { 'max-width': '100%', 'height': 'auto' }
            });
            
            this.rendition.themes.select('custom');
        },
        
        cycleTheme() {
            const themes = ['light', 'dark', 'sepia'];
            const idx = themes.indexOf(this.theme);
            this.theme = themes[(idx + 1) % themes.length];
            this.$nextTick(() => this.applyStyles());
        },
        
        resizeViewer() {
            if (this.rendition) {
                setTimeout(() => this.rendition.resize(), 350);
            }
        },
        
        // ===== 关闭书籍 =====
        closeBook() {
            if (this.rendition) {
                this.rendition.destroy();
                this.rendition = null;
            }
            if (this.book) {
                this.book.destroy();
                this.book = null;
            }
            this.bookLoaded = false;
            this.bookTitle = '';
            this.spineItems = [];
            this.toc = [];
            this.currentSpineIndex = 0;
        }
    }));
});
