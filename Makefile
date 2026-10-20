ENGINE ?= xelatex
BUILD := build

.PHONY: all check clean bundle sample
all: $(BUILD)/paper.pdf

$(BUILD)/paper.pdf: paper.tex mbts.cls mbts.sty
	mkdir -p $(BUILD)
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) paper.tex
	$(ENGINE) -interaction=nonstopmode -halt-on-error -output-directory=$(BUILD) paper.tex

check:
	python3 tests/check.py

sample: all
	cp $(BUILD)/paper.pdf paper.pdf

bundle: all
	python3 -c 'from zipfile import ZipFile; from pathlib import Path; z=ZipFile("build/mbts-template.zip", "w"); [z.write(p, p.name) for p in map(Path, ["mbts.cls", "mbts.sty", "paper.tex", "README.md", "build/paper.pdf"])]; z.close()'

clean:
	rm -rf $(BUILD)
