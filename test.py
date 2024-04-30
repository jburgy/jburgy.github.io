from __future__ import annotations

import asyncio
from contextlib import suppress
from html.parser import HTMLParser
from http import HTTPStatus
from pathlib import Path

import aiohttp


class LinkFinder(HTMLParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.hrefs = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag != "a":
            return
        self.hrefs.update(val for key, val in attrs if key == "href")


async def head(session: aiohttp.ClientSession, href: str) -> tuple[str, HTTPStatus]:
    status = HTTPStatus.NOT_FOUND
    if href.startswith(r"/"):
        href = "https://bur.gy" + href
    with suppress(aiohttp.InvalidURL):
        async with session.head(href) as response:
            status = response.status
    return href, status


async def statuses(hrefs: set[str]) -> dict[str, int]:
    result = {}
    async with aiohttp.ClientSession() as session:
        result = {
            href: status
            for href, status in await asyncio.gather(
                *[head(session, href) for href in link_finder.hrefs]
            )
            if status
            not in {
                HTTPStatus.OK,
                HTTPStatus.MOVED_PERMANENTLY,
                HTTPStatus.FOUND,
                HTTPStatus.FORBIDDEN,
                HTTPStatus.METHOD_NOT_ALLOWED,
                HTTPStatus.NOT_ACCEPTABLE,
            }
        }

    return result


link_finder = LinkFinder()

for file in (Path.home() / "jburgy.github.io" / "docs" / "_site").glob("**/*.html"):
    link_finder.feed(file.read_text())

result = asyncio.run(statuses(link_finder.hrefs))

print(result)
