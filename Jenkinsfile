pipeline {
    agent { label 'ecs' }
    // parameters {
    //     string(name: 'ALIAS_VERSION', description: 'Alias version', defaultValue: 'v1')
    // }
    stages {
        stage('Set parameters') {
            steps {
                script{
                    echo "GIT_BRANCH: ${GIT_BRANCH}"
                    // echo "ALIAS_VERSION: ${ALIAS_VERSION}"
                    // env.ALIAS_VERSION="${ALIAS_VERSION}"
                    echo sh(script: 'env|sort', returnStdout: true)
                    if ("${GIT_BRANCH}".startsWith("PR-")){
                        if("${CHANGE_TARGET}".contains("develop")){
                            env.ENVIRONMENT=env.getProperty("environment_develop")
                        } else if("${CHANGE_TARGET}".contains("master")){
                            env.ENVIRONMENT=env.getProperty("environment_prod")
                        }
                    } else if ("${GIT_BRANCH}".contains("feature") || "${GIT_BRANCH}".contains("bugfix") || "${GIT_BRANCH}".contains("develop")) {
                        env.ENVIRONMENT=env.getProperty("environment_develop")
                    } else if ("${GIT_BRANCH}".contains("master") || "${GIT_BRANCH}".contains("hotfix")){
                        env.ENVIRONMENT=env.getProperty("environment_prod")
                    }
                    sh """
                    echo "Environment: "${env.ENVIRONMENT}
                    """
                }
            }
        }

        stage('Build'){
            steps {
                script {
                    echo "GIT_BRANCH: ${GIT_BRANCH}"
                    sh """
                        npm i
                        cd lib/nodejs
                        npm i
                    """
                }
            }
        }

        stage('Omni Deploy'){
            when {
                anyOf {
                    branch 'master';
                    branch 'develop';
                }
                expression {
                    return true;
                }
            }
            steps {
                withAWS(credentials: 'omni-aws-creds'){
                    sh """
                    sls deploy -s ${env.ENVIRONMENT}
                    """
                }
            }
        }
    }
}
