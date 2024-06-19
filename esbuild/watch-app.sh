#!/bin/bash

yarn package

cd infra

STAGE=local yarn synth:app