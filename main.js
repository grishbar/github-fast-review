const GITHUB_HOST = 'github.com';

const ghSelectors = {
    target: '#files',
    newCommentClassname: 'js-inline-comments-container',
    insert: '.js-comments-holder',
    lastInjectedCommentsContainer: 'div.js-line-comments .ccbe--container',
}

const selectorsMap = {
    gh: ghSelectors,
}

const commentSelect = `
<details id="select-menu-fec3c03a-9044-40f0-8761-449853f354ee"
    class="details-overlay details-reset position-relative ml-2 mb-1 mb-lg-0">
    <summary role="button" class="btn">
        Стандартный комментарий
        <svg aria-hidden="true" height="16"
            viewBox="0 0 16 16" version="1.1" width="16"
            class="octicon octicon-triangle-down ml-2 mr-n1">
            <path
                d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z">
            </path>
        </svg>
    </summary>

    <div id="select-menu-fec3c03a-9044-40f0-8761-449853f354ee" class="SelectMenu right-0">
        <div class="SelectMenu-modal">
            <div id="select-menu-fec3c03a-9044-40f0-8761-449853f354ee-list-1" class="SelectMenu-list">
                <div role="menu">
                    ${window.comments.map((comment, index) => {
                        return `<div role="select" class="SelectMenu-item js-add-standard-comment" data-index=${index}>
                            ${comment.label}
                        </div>`
                    }).join('')}
                </div>
            </div>

        </div>
    </div>
</details>
`

const conventionalComments = [
    {
        key: 'suggestion',
        comment: '`можно лучше`',
        buttonText: 'можно лучше',
        isBlocking: false,
        classNames: ['btn'],
    },
    {
        key: 'issue',
        comment: '`надо исправить`',
        buttonText: 'надо исправить',
        isBlocking: true,
        classNames: ['btn', 'btn-danger'],
    },
    {
        key: 'praise',
        comment: '`отлично`',
        buttonText: 'отлично',
        isBlocking: false,
        classNames: ['btn', 'btn-primary'],
    },
];

const possibleConventionalCommentTexts = conventionalComments.map(({ comment }) => comment);

const main = () => {
    const repoType = 'gh';
    const selectors = ghSelectors;

    // todo в объекте селекторов и тут переменные называются одинаково это неправильно сильно путает, исправить
    let lastInjectedCommentsContainer;

    const lastInjectedContainer = () => lastInjectedCommentsContainer?.querySelector(selectors.lastInjectedCommentsContainer);

    // проверка на то нужно вставлять блок с кнопками или нет
    const shoudInjectCC = (nodes, selector) => {
        let isActiveComment = true;
        return nodes.length === 1 && nodes[0].classList && nodes[0].classList.contains(selector) && isActiveComment;
    }

    /**
     * Метод реагирующий на изменение DOM (как только появится комментарий, то начинаем исполнять функцию)
     */
    const respondToMutation = (mutationList, _observer) => {
        mutationList.forEach((mutation) => {
            switch (mutation.type) {
                case 'childList':
                    // вставляем блок с кнопками для обычных комментариев
                    let nodes = mutation.addedNodes
                    if (shoudInjectCC(nodes, selectors.newCommentClassname)) {
                        if (selectors.activeComment && !nodes[0].querySelector(selectors.activeComment)) {
                            return
                        }
                        lastInjectedCommentsContainer = nodes[0];
                        injectContainer(lastInjectedCommentsContainer.querySelector(selectors.insert));
                        addRemoveBlockListeners();
                    }
                    break;
            }
        });
    }

    // todo добавить удаление этих листенеров
    const addRemoveBlockListeners = (lastInjectedCommentsContainer) => {
        const buttonsClassses = ['comment-form__controls-cancel', 'comment-form__controls-submit', 'comment-form__controls-update'];

        if (!lastInjectedCommentsContainer) {
            return;
        }
        [...lastInjectedCommentsContainer.querySelectorAll('.yc-button')].map(buttton => {
            buttton.addEventListener('click', (e) => {
                console.log('click on lastInjectedCommentsContainer', e.currentTarget);
                if (buttonsClassses.some(buttonClass => e.currentTarget.classList.contains(buttonClass))) {
                    lastInjectedCommentsContainer.querySelector('.ccbe--container')?.remove();
                }
            }, true);
        })
    }

    /**
     * Вставляет контейнер с conventional comments кнопками
     *
     * @param target контейнер, куда вставляем наш блок с кнопками
     */
    const injectContainer = (target) => {
        let container = document.createElement("div");
        container.classList.add("ccbe--container");
        if (repoType === 'gh') {
            target.after(container);
        } else {
            target.prepend(container);
            container.classList.add("__big-padding");
        }
        injectButtons(container);
        container.insertAdjacentHTML('beforeend', commentSelect);
        addEventListeners(container);
    }

    const injectButtons = (container) => {
        conventionalComments.map(conventionalComment => buildButton(container, conventionalComment));
    };

    const buildButton = (parent, {key, comment, isBlocking, buttonText, classNames}) => {
        const button = document.createElement("button");
        const gitHubClasses = ["btn", "ml-1", "my-1"];
        button.classList.add(
            ...gitHubClasses,
            "ccbe--button",
            key,
            `ccbe--button-blocking-${isBlocking}`,
            ...classNames,
        );
        button.title = buildCommentTitle(
            { key, isBlocking }
        );
        button.textContent = buttonText;
        button.dataset.comment = comment;
        button.dataset.blocking = isBlocking;
        parent.appendChild(button);

        return button;
    };

    const addEventListeners = (container) => {
        Array.prototype.filter.call(
            container.querySelectorAll(".ccbe--button"),
            (button) => !button.dataset.listening
        ).forEach((button) => {
            button.addEventListener("click", (e) => appendCommentTemplate(e));
            button.dataset.listening = true;
        });

        container.addEventListener('click', (e) => {
            console.log(e);
            if (e.target.className.indexOf('js-add-standard-comment') === -1) {
                return;
            }
            const textarea = e.target.closest('.js-line-comments').querySelector("textarea"); 
            textarea.value = window.comments[Number(e.target.dataset.index)].comment;    
        });
    }

    /**
     * Генерирует текст для вставки в комментарий
     *
     * @param textarea контейнер, комментария
     * @param dataset объект с данными кнопки { comment: string, blocking: string }
     */
    const buildCommentTemplate = (textarea, dataset) => {
        for (const conventionalComment of possibleConventionalCommentTexts) {
            const conventionalCommentIndex = textarea.value.indexOf(conventionalComment);
            if (conventionalCommentIndex > -1) {
                const resultText = textarea.value.trim().split('');
                resultText.splice(conventionalCommentIndex, conventionalComment.length, dataset.comment);
                return resultText.join('');
            }
        }

        return `${dataset.comment} ${textarea.value}`;
    };

    const buildCommentTitle = ({ key, isBlocking }) => `${key} (${isBlocking ? "blocking" : "non-blocking"})`;

    const appendCommentTemplate = (e) => {
        const textarea = e.target.parentElement.nextElementSibling.querySelector("textarea");
        const dataset = e?.hotkeyEventDataset || e.target.dataset;
        textarea.value = buildCommentTemplate(textarea, dataset);
    };

    const hotkeyEvent = (comment) => {
        const target =
            document.querySelector(".details-overlay[open] .ccbe--container")
                ?.firstChild || lastInjectedContainer().firstChild;
        return {
            target,
            hotkeyEventDataset: { comment: comment },
        };
    };

    /**
     * Обрабатывает событие нажатия на клавиши
     * Сейчас это ctrl + alt + первая буква конвеншионал комментария
     *
     * @param e событие нажатия на клавишу
     */
    const captureHotkeys = (e) => {
        if (e.altKey && e.ctrlKey) {
            switch (e.keyCode) {
                case 67: // c
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 73: // i
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 78: // n
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 80: // p
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 81: // q
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 83: // s
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
                case 84: // t
                    appendCommentTemplate(hotkeyEvent(getConventionalCommentFromKeyboard(e)));
                    break;
            }
        }
    };

    // Если зажат shift, то это добавляет блокирующий модификатор
    const blockingModifier = (e) => {
        return !!e.shiftKey;
    };

    const getConventionalCommentFromKeyboard = (e) => {
        return conventionalComments.find(({ buttonText, isBlocking }) => {
            const isSameKey = String.fromCharCode(e.keyCode).toLowerCase() === buttonText;
            const isSameBlocking = blockingModifier(e) === isBlocking;
            return isSameKey && isSameBlocking;
        }).comment;
    }

    const targetNode = document.querySelector(selectors.target);

    const observerOptions = {
        childList: true,
        attributes: false,
        subtree: true
    }
    const observer = new MutationObserver(respondToMutation);

    if (targetNode) observer.observe(targetNode, observerOptions);
    document.onkeydown = captureHotkeys;
}

document.addEventListener("DOMContentLoaded", main);
document.addEventListener("pjax:end", main);
