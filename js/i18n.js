/**
 * WisePic 多语言支持
 * 支持英文和中文，自动检测用户语言偏好
 */

const I18n = {
    // 当前语言
    currentLang: 'en',

    // 可用语言
    supportedLangs: ['zh-CN', 'en'],

    // 翻译数据
    translations: {},

    // 初始化
    init() {
        console.log('I18n.init() started');
        // 加载用户语言偏好
        this.loadLanguagePreference();
        console.log('Current language set to:', this.currentLang);

        // 加载翻译文件
        this.loadTranslations().then(() => {
            console.log('Translations loaded successfully');
            // 更新页面文本
            this.updatePage();

            // 初始化语言切换器
            this.initLanguageSwitcher();

            // 更新HTML lang属性
            this.updateHtmlLang();
            console.log('I18n initialization completed');
        }).catch(error => {
            console.error('Failed to load translations:', error);
        });
    },

    // 加载用户语言偏好
    loadLanguagePreference() {
        // 1. 检查localStorage
        const savedLang = localStorage.getItem('wisepic_lang');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            this.currentLang = savedLang;
            return;
        }

        // 2. 检查浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang) {
            // 检查是否支持完整语言代码（如zh-CN）
            if (this.supportedLangs.includes(browserLang)) {
                this.currentLang = browserLang;
                return;
            }

            // 检查语言前缀（如zh）
            const langPrefix = browserLang.split('-')[0];
            if (langPrefix === 'zh') {
                this.currentLang = 'zh-CN';
                return;
            } else if (langPrefix === 'en') {
                this.currentLang = 'en';
                return;
            }
        }

        // 3. 默认语言
        this.currentLang = 'en';
    },

    // 加载翻译文件
    async loadTranslations() {
        const url = `locales/${this.currentLang}.json`;
        console.log('Loading translations from:', url);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load translation file: ${response.status} ${response.statusText}`);
            }
            this.translations = await response.json();
            console.log('Translations loaded via fetch:', Object.keys(this.translations));
        } catch (error) {
            console.error('Fetch error:', error);
            // 尝试备用路径
            const altUrl = `./locales/${this.currentLang}.json`;
            console.log('Trying alternative URL:', altUrl);
            try {
                const altResponse = await fetch(altUrl);
                if (!altResponse.ok) {
                    throw new Error(`Alternative path also failed: ${altResponse.status}`);
                }
                this.translations = await altResponse.json();
                console.log('Translations loaded from alternative path');
            } catch (altError) {
                console.error('All fetch attempts failed:', altError);
                // 尝试使用XMLHttpRequest作为最后的手段
                console.log('Trying XMLHttpRequest as fallback');
                await this.loadWithXMLHttpRequest(url);
            }
        }
    },

    // 使用XMLHttpRequest加载翻译文件（fetch备选方案）
    async loadWithXMLHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.translations = xhr.response;
                    console.log('Translations loaded via XMLHttpRequest:', Object.keys(this.translations));
                    resolve();
                } else {
                    reject(new Error(`XMLHttpRequest failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error('XMLHttpRequest network error'));
            };

            xhr.send();
        });
    },

    // 更新页面文本
    updatePage() {
        console.log('updatePage() called');
        // 获取所有带有data-i18n属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        console.log(`Found ${elements.length} elements with data-i18n attribute`);

        let updatedCount = 0;
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);

            if (translation !== undefined) {
                // 如果是select option，更新value属性
                if (element.tagName === 'OPTION') {
                    // option的文本内容由翻译提供
                    element.textContent = translation;
                    updatedCount++;
                } else if (element.tagName === 'SELECT') {
                    // 对于select，更新选中的option
                    // 文本内容不变，由options处理
                } else {
                    // 保留现有HTML结构，只更新文本内容
                    // 如果元素有子元素（如图标），只替换文本节点
                    this.updateElementText(element, translation);
                    updatedCount++;
                }
            }
        });

        console.log(`Updated ${updatedCount} elements`);
        // 更新页面标题
        this.updatePageTitle();
    },

    // 获取翻译文本
    getTranslation(key) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return undefined;
            }
        }

        return value;
    },

    // 更新元素文本（保留子元素）
    updateElementText(element, text) {
        // 如果元素只有文本节点，直接替换
        if (element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE) {
            element.textContent = text;
            return;
        }

        // 否则，查找第一个文本节点并替换
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                node.textContent = text;
                return;
            }
        }

        // 如果没有找到文本节点，添加新的文本节点
        element.appendChild(document.createTextNode(text));
    },

    // 更新页面标题
    updatePageTitle() {
        // 根据当前页面获取标题键
        const path = window.location.pathname;
        let titleKey = '';

        if (path.endsWith('index.html') || path.endsWith('/')) {
            titleKey = 'index.heroTitle';
        } else if (path.endsWith('terms.html')) {
            titleKey = 'terms.pageTitle';
        } else if (path.endsWith('privacy.html')) {
            titleKey = 'privacy.pageTitle';
        } else if (path.endsWith('third-party.html')) {
            titleKey = 'thirdParty.pageTitle';
        } else if (path.endsWith('google-data-deletion.html')) {
            titleKey = 'dataDeletion.pageTitle';
        }

        if (titleKey) {
            const translation = this.getTranslation(titleKey);
            if (translation) {
                document.title = translation + ' - WisePic';
            }
        }
    },

    // 初始化语言切换器
    initLanguageSwitcher() {
        const switcher = document.getElementById('languageSelect');
        console.log('Language switcher element:', switcher);
        if (!switcher) {
            console.warn('Language switcher not found!');
            return;
        }

        // 设置当前选中的语言
        switcher.value = this.currentLang;
        console.log('Language switcher value set to:', this.currentLang);

        // 添加事件监听器
        switcher.addEventListener('change', (event) => {
            console.log('Language switcher changed to:', event.target.value);
            this.changeLanguage(event.target.value);
        });
        console.log('Language switcher event listener added');
    },

    // 切换语言
    async changeLanguage(lang) {
        console.log('changeLanguage() called with:', lang);
        if (!this.supportedLangs.includes(lang)) {
            console.error(`Unsupported language: ${lang}`);
            return;
        }

        // 更新当前语言
        this.currentLang = lang;
        console.log('Current language updated to:', lang);

        // 保存到localStorage
        localStorage.setItem('wisepic_lang', lang);
        console.log('Language saved to localStorage');

        // 重新加载翻译文件
        try {
            await this.loadTranslations();

            // 更新页面
            this.updatePage();
            this.updateHtmlLang();

            // 更新语言切换器选中状态
            const switcher = document.getElementById('languageSelect');
            if (switcher) {
                switcher.value = lang;
                console.log('Language switcher UI updated');
            }

            console.log(`Language successfully changed to: ${lang}`);
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    },

    // 更新HTML lang属性
    updateHtmlLang() {
        document.documentElement.setAttribute('lang', this.currentLang);
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});

// 导出为全局变量
window.I18n = I18n;