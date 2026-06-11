/**
 * This script calls the functions that generate the content of the workshop-creator page.
 * 
 */

import { createHeader } from "./HEADER/header.mjs";
import { createMain } from "./MAIN/main.mjs";

const BODY = document.body;

//TODO  generate header
const HEADER = createHeader();
BODY.appendChild(HEADER);

//TODO generate main
const MAIN = createMain();
BODY.appendChild(MAIN);

//TODO generate footer