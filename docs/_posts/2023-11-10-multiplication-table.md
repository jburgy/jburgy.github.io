---
layout: post
title:  "How did you learn your times table?"
date:   2023-11-10 22:16:20 -0500
---

<style>
table {
    border-spacing: 0;
    height: 100%;  /* https://stackoverflow.com/a/53491471/8479938 */
    text-align: center;
    width: 100%;
}
table td, table th {
    border: none;
    padding: 0;
    padding-block: 0; 
}
table input[type="tel"] {
    display: flex;
    border-radius: 0;
    border-width: 0.5px;
    box-sizing: border-box;
    height: 100%;
    margin: 1px;
    padding: 0;
    text-align: center;
    width: 100%;
}
table input[type="tel"]:invalid { color: #c00; }
</style>

When a middle schooler from Arkansas, talking about "educating more people to
operate these instruments", asked Hungarian-born polymath
[John von Neumann](https://en.wikipedia.org/wiki/John_von_Neumann) whether
"there [is] enough people to do it",  [Von Neumann replied](https://www.youtube.com/watch?v=vLbllFHBQM4)
"[n]o, we don't have enough people and we better do something about it, and I
hesitate to say that we better do something about it quickly but we'd rather
do something about it both quickly and then continuously".

The United States heard that message in the early 1950s and set out to do
something about it quickly.  Decades later, I'm not so sure about the
continuously part of it.  I have misgivings about the current state
of math education in this country. I fear we have a bunch of educators with
a limited understanding of the subject looking for silver bullets by looking
for the new hot method (new math, Singapore math, ...)  Instead, we should
take a hard look at the curriculum and edit it with a machete.  Math is 
vibrant and, with the renewed excitement around Artificial Intelligence,
more relevant than ever.  School kids need to be spending less time on tedious
mechanical aspects like long addition, multiplication, and division and more
times on advanced topics like linear algebra or statistics.

That said, there's no substitute for rote memorization of the basics.
The pandemic left my child with gaps in knowledge so I needed to help her
memorize her multiplication table.  We tried a number of approaches until
I had a rather basic idea during my commute home.  I wrote less that
[three dozen lines of python](https://gist.github.com/jburgy/3a67e04df3af71e9fd48a0af92cdc14f)
to generate the HTML below.  All it does is let you enter the product of the row
by the column.  It will highlight it in red when you get it wrong. 

<table>
  <thead>
    <tr>
      <th>&times;</th>
      <th>1</th>
      <th>2</th>
      <th>3</th>
      <th>4</th>
      <th>5</th>
      <th>6</th>
      <th>7</th>
      <th>8</th>
      <th>9</th>
      <th>10</th>
      <th>11</th>
      <th>12</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>1</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=1></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=2></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=3></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=4></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=5></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=6></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=7></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=8></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=9></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=10></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=11></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
    </tr>
    <tr>
      <th>2</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=2></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=4></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=6></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=8></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=10></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=14></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=16></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=18></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=20></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=22></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
    </tr>
    <tr>
      <th>3</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=3></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=6></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=9></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=15></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=18></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=21></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=27></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=30></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=33></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=36></td>
    </tr>
    <tr>
      <th>4</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=4></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=8></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=16></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=20></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=28></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=32></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=36></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=40></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=44></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=48></td>
    </tr>
    <tr>
      <th>5</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=5></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=10></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=15></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=20></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=25></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=30></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=35></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=40></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=45></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=50></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=55></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=60></td>
    </tr>
    <tr>
      <th>6</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=6></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=18></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=30></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=36></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=42></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=48></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=54></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=60></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=66></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=72></td>
    </tr>
    <tr>
      <th>7</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=7></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=14></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=21></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=28></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=35></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=42></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=49></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=56></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=63></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=70></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=77></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=84></td>
    </tr>
    <tr>
      <th>8</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=8></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=16></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=32></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=40></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=48></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=56></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=64></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=72></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=80></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=88></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=96></td>
    </tr>
    <tr>
      <th>9</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=9></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=18></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=27></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=36></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=45></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=54></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=63></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=72></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=81></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=90></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=99></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=108></td>
    </tr>
    <tr>
      <th>10</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=10></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=20></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=30></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=40></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=50></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=60></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=70></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=80></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=90></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=100></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=110></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=120></td>
    </tr>
    <tr>
      <th>11</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=11></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=22></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=33></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=44></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=55></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=66></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=77></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=88></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=99></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=110></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=121></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=132></td>
    </tr>
    <tr>
      <th>12</th>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=12></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=24></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=36></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=48></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=60></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=72></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=84></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=96></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=108></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=120></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=132></td>
      <td><input type="tel" required minlength=1 maxlength=3 size=1 pattern=144></td>
    </tr>
  </tbody>
</table>
