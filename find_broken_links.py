# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "aiohttp",
# ]
# ///

import asyncio
from contextlib import suppress
from html.parser import HTMLParser
from http import HTTPStatus
from pathlib import Path
from typing import cast

import aiohttp  # type: ignore[missing-imports]


class LinkFinder(HTMLParser):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.hrefs = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag != "a":
            return
        self.hrefs.update(
            val
            for key, val in attrs
            if key == "href"
            and isinstance(val, str)
            and not val.startswith(
                ("https://bur.gy/", "https://news.ycombinator.com/item?id=", "#fn")
            )
        )


async def head(session: aiohttp.ClientSession, href: str) -> tuple[str, HTTPStatus]:
    status = HTTPStatus.NOT_FOUND
    href = href.removeprefix("http://localhost:4000")
    if href.startswith(r"/"):
        href = "https://bur.gy" + href
    with suppress(aiohttp.InvalidURL, aiohttp.ConnectionTimeoutError, aiohttp.ClientConnectorCertificateError):
        async with session.head(href) as response:
            status = HTTPStatus(response.status)
    return href, status


async def statuses(hrefs: set[str]) -> dict[str, HTTPStatus]:
    result = {}
    async with aiohttp.ClientSession() as session:
        result = {
            href: cast("HTTPStatus", status)
            for href, status in await asyncio.gather(
                *[head(session, href) for href in link_finder.hrefs]
            )
            if status
            not in {
                HTTPStatus.OK,
                HTTPStatus.FOUND,
                HTTPStatus.FORBIDDEN,
                HTTPStatus.IM_A_TEAPOT,
            }
        }

    return result


link_finder = LinkFinder()

for file in (Path("docs") / "_site").glob("**/*.html"):
    link_finder.feed(file.read_text())

result = asyncio.run(statuses(link_finder.hrefs))
if result:
    print(result)
    exit(1)
