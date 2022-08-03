/**
 * The editor checker is scanning the currently opened document and checks if a date is written
 * if there is a date with @ an dropdown will apear to select a event that is due to this date
 */

import type { Editor } from "obsidian";
import type GoogleCalendarPlugin from "../GoogleCalendarPlugin";

import { EventSelectReplaceModal } from "../modal/EventSelectReplaceModal";
import { googleListEvents } from "../googleApi/GoogleListEvents";

export function checkEditorForAtDates(
	editor: Editor,
	plugin: GoogleCalendarPlugin
): void {
	// Run functions until one of the functions returns true to stop the chain.
	check4Word("@today", editor, plugin) ||
		check4Word("@tomorrow", editor, plugin) ||
		check4Word("@yesterday", editor, plugin) ||
		check4Word("@REGEX", editor, plugin) ||
		check4Word("@YYYY-MM-DD", editor, plugin);
}

function check4Word(
	word: string,
	editor: Editor,
	plugin: GoogleCalendarPlugin
): boolean {
	const endPos = editor.getCursor();
	let startPos = editor.getCursor();
	let realWord = "";
	let date = window.moment();

	if (word === "@REGEX") {
		const realLine = editor.getLine(endPos.line);
		const match = realLine.match(/.*@([+,-])(\d+).*/) ?? [];

		if (match.length != 3) return false;

		startPos = { ...endPos, ch: endPos.ch - match[1].length - match[2].length - 1 };

		if (startPos.ch < 0) return;

		realWord = editor.getRange(startPos, endPos);

		if (match[1] == "+") {
			date = window.moment().add(match[2], "day");
		} else {
			date = window.moment().subtract(match[2], "day");
		}

	} else if (word === "@YYYY-MM-DD") {
		startPos = { ...endPos, ch: endPos.ch - word.length };
		realWord = editor.getRange(startPos, endPos);

		if (!realWord.startsWith("@")) return false;

		const tmpDate = window.moment(realWord.substring(1));
		if (tmpDate.isValid()) {
			date = tmpDate;
		} else {
			return false;
		}

	} else {
		startPos = { ...endPos, ch: endPos.ch - word.length };

		if (startPos.ch < 0) return false;
		const realWord = editor.getRange(startPos, endPos);

		if (realWord != word) return false;

		switch (word) {
			case "@today":
				date = window.moment()
				break;
			case "@tomorrow":
				date = window.moment().add(1, "day")
				break;
			case "@yesterday":
				date = window.moment().add(-1, "day")
				break;
			default:
				return false;
		}

	}

	googleListEvents(plugin, date).then((events) => {
		new EventSelectReplaceModal(
			plugin,
			events,
			editor,
			startPos,
			endPos,
			realWord
		).open();
	});

	return true;
}
