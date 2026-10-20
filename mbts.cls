\NeedsTeXFormat{LaTeX2e}[2020/10/01]
\ProvidesClass{mbts}[2026/10/20 v0.1.0 MBTS course papers]
% The class is a convenience wrapper; the layout lives in mbts.sty.
\DeclareOption*{\PassOptionsToPackage{\CurrentOption}{mbts}}
\ProcessOptions\relax
\LoadClass[12pt,letterpaper,oneside]{article}
\RequirePackage{mbts}
\endinput
