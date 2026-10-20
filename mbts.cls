\NeedsTeXFormat{LaTeX2e}[2020/10/01]
\ProvidesClass{mbts}[2026/10/20 v0.2.0 Midwestern fourth-edition documents]
% The class is a convenience wrapper; the layout lives in mbts.sty.
\newif\ifmbtsclassdissertation
\DeclareOption{dissertation}{\mbtsclassdissertationtrue
  \PassOptionsToPackage{dissertation}{mbts}}
\DeclareOption*{\PassOptionsToPackage{\CurrentOption}{mbts}}
\ProcessOptions\relax
\ifmbtsclassdissertation
  \LoadClass[12pt,letterpaper,oneside]{report}
\else
  \LoadClass[12pt,letterpaper,oneside]{article}
\fi
\RequirePackage{mbts}
\endinput
