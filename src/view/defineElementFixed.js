import { defineElement } from './defineElement';

export function defineElementFixed(tag, arg1, arg2) {
	return defineElement(tag, arg1, arg2, true);
}