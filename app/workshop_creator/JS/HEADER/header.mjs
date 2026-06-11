/**
 *  Creates the header for the page and returns it.
 * 
 *  Following IDs exist within the Header: header-logo, page-navigation
 */
export function createHeader() {

    const HEADER = document.createElement("header");

    const HEADER_LOGO = createHeaderLogo();
    HEADER.appendChild(HEADER_LOGO);

    const PAGE_NAVIGATION = createPageNavigation();
    HEADER.append(PAGE_NAVIGATION)

    return HEADER;
}



function createHeaderLogo() {
    const HEADER_LOGO_CONTAINER = document.createElement("div");
    HEADER_LOGO_CONTAINER.id = "header-logo-container";

    const LOGO_LINK = document.createElement("a");
    LOGO_LINK.href = "/";

    const LOGO_IMG = document.createElement("img");
    LOGO_IMG.id = "header-logo";
    LOGO_IMG.src = "IMAGES/placeholder.jpg";
    LOGO_IMG.alt = "Logo";

    LOGO_LINK.appendChild(LOGO_IMG);
    HEADER_LOGO_CONTAINER.appendChild(LOGO_LINK);
    return HEADER_LOGO_CONTAINER;

}



function createPageNavigation() {
    const PAGE_NAVIGATION = document.createElement("nav");
    PAGE_NAVIGATION.id = "page-navigation";

    insertNavigationLinks(PAGE_NAVIGATION);

    return PAGE_NAVIGATION;
}



function insertNavigationLinks(pageNavigation) {
    // pages and their corresponding links
    const PAGES = [
        { value: '../home', text: 'Home' },
        { value: '../infos', text: 'Infos' },
        { value: '../kontakt', text: 'Kontakt' }
    ];

    // creating page links in DOM
    PAGES.forEach(pageData => {
        const PAGE_LINK = document.createElement('a');
        PAGE_LINK.href = pageData.value;
        PAGE_LINK.textContent = pageData.text;

        pageNavigation.appendChild(PAGE_LINK);
    });
}