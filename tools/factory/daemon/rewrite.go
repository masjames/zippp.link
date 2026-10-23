package main

import (
	"errors"
	"os"
	"path/filepath"
)

func replaceStatus(raw []byte, to string) ([]byte, error) {
	loc := fmRe.FindSubmatchIndex(raw)
	if loc == nil {
		return nil, errors.New("no frontmatter")
	}
	s, e := loc[2], loc[3]
	fm := raw[s:e]
	if !statusRe.Match(fm) {
		return nil, errors.New("no status line")
	}
	newFM := statusRe.ReplaceAllLiteral(fm, []byte("status: "+to))
	out := make([]byte, 0, len(raw))
	out = append(out, raw[:s]...)
	out = append(out, newFM...)
	out = append(out, raw[e:]...)
	return out, nil
}

func SetStatus(path, id, from, to string) error {
	raw, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	entity, err := ParseEntity(filepath.ToSlash(path), raw)
	if err != nil {
		return err
	}
	if entity.ID != id {
		return errors.New("id mismatch")
	}
	if entity.Status != from {
		return errors.New("status mismatch")
	}
	out, err := replaceStatus(raw, to)
	if err != nil {
		return err
	}
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".factory-tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if err := tmp.Chmod(info.Mode()); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(out); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
