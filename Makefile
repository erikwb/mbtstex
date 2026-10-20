ENGINE ?= xelatex
BIBER ?= biber
BUILD := build
STYLE := $(wildcard mbts*.sty) mbts.cls mbts.bbx mbts.cbx mbts.dbx
EXAMPLES := dissertation book-review annotated-bibliography

.PHONY: all check clean bundle sample examples citations
all: $(BUILD)/paper.pdf

$(BUILD)/paper.pdf: paper.tex $(STYLE)
	mkdir -p $(BUILD)
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) paper.tex
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) paper.tex

check:
	MBTS_TEST_BIBLATEX=1 BIBER=$(BIBER) python3 tests/check.py

examples: $(EXAMPLES:%=$(BUILD)/%.pdf) citations

$(BUILD)/%.pdf: examples/%.tex $(STYLE)
	mkdir -p $(BUILD)
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) $<
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) $<

citations: $(BUILD)/citations.pdf

$(BUILD)/citations.pdf: examples/citations.tex examples/citations.bib $(STYLE)
	mkdir -p $(BUILD)
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) $<
	$(BIBER) --input-directory=$(BUILD) --output-directory=$(BUILD) citations
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) $<
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) $<

sample: all
	cp $(BUILD)/paper.pdf paper.pdf

bundle: all
	python3 -c 'from zipfile import ZipFile; from pathlib import Path; z=ZipFile("build/mbts-template.zip", "w"); [z.write(p, p) for p in [*Path(".").glob("mbts.*"), *Path(".").glob("mbts-*.sty"), Path("paper.tex"), Path("README.md"), *Path("examples").glob("*"), *Path("docs").glob("*.md")]]; z.write("build/paper.pdf", "paper.pdf"); z.close()'

clean:
	rm -rf $(BUILD)
