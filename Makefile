SHELL := /bin/bash

setup-predeploy:
	virtualenv venv
	source venv/bin/activate
	pip install cfn-flip==1.2.2

clean:
	rm -rf *.zip src/handlers/copy-files/nodejs/

build-static:
	cd src/handlers/copy-files && npm install --prefix nodejs mime-types && cp index.js nodejs/node_modules/

package-static:
	make build-static