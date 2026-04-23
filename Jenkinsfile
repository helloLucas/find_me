pipeline {
    agent any

    tools {
        nodejs 'node' 
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        DOCKER_HUB_ID = 'shyunnnn' 
        FRONT_IMAGE = "${DOCKER_HUB_ID}/find-me-frontend"
        BACK_IMAGE = "${DOCKER_HUB_ID}/find-me-backend"
        
        ENV_TAG = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: "").contains('main') ? 'prod' : 'dev'}"
        
        GITLAB_URL = "lab.ssafy.com/s14-final/S14P31B102.git"
    }

    stages {
        stage('Initialize & Release') {
            steps {
                script {
                    // 1. 다양한 변수에서 브랜치명을 추출 (일반 Pipeline 호환용)
                    // env.BRANCH_NAME이 없으면 env.GIT_BRANCH나 GitLab 플러그인 변수를 확인합니다.
                    def rawBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: env.gitlabTargetBranch ?: ""
                    
                    // 2. 'origin/develop' 같이 경로가 포함된 경우를 대비해 순수 이름만 추출
                    def currentBranch = rawBranch.replace('origin/', '')
                    
                    echo "--- 디버깅: 현재 인식된 브랜치명: ${currentBranch} ---"

                    // 3. 브랜치 검증
                    if (!(currentBranch in ['main', 'develop'])) {
                        currentBuild.result = 'ABORTED'
                        error "배포 중단: 대상 브랜치가 아닙니다. (인식된 브랜치: ${currentBranch})"
                    }

                    // 4. 환경에 따른 처리 (currentBranch 변수 사용)
                    if (currentBranch == 'main') {
                        echo "--- 운영 환경 ---"
                        withCredentials([usernamePassword(credentialsId: 'gitlab-auth', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                            sh "export GL_TOKEN=${GIT_TOKEN} && npx semantic-release"
                        }
                        env.IMAGE_TAG = sh(script: "git describe --tags --abbrev=0", returnStdout: true).trim()
                    } else {
                        echo "--- 개발 환경 ---"
                        env.IMAGE_TAG = "${env.BUILD_NUMBER}-dev"
                    }
                    
                    // 5. 이후 단계를 위해 브랜치명을 표준화된 변수로 저장
                    env.NORMALIZED_BRANCH = currentBranch
                }
            }
        }

        stage('Frontend Build & Push') {
            when { 
                expression { return isTargetBranch() }
                // anyOf { branch 'main'; branch 'develop' }
                // changeset "frontend/**" 
            }
            steps {
                script {
                    def frontendSecretId = "frontend-env-${ENV_TAG}"
                    withCredentials([file(credentialsId: frontendSecretId, variable: 'FRONT_ENV_FILE')]) {
                        def apiUrl = sh(script: "grep VITE_API_BASE_URL ${FRONT_ENV_FILE} | cut -d '=' -f2", returnStdout: true).trim()
                        dir('frontend') {
                            sh "docker build --build-arg VITE_API_BASE_URL=${apiUrl} -t ${FRONT_IMAGE}:${env.IMAGE_TAG} ."
                            sh "docker tag ${FRONT_IMAGE}:${env.IMAGE_TAG} ${FRONT_IMAGE}:${ENV_TAG}-latest"
                            withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                                sh "docker login -u $USER -p $PASS"
                                sh "docker push ${FRONT_IMAGE}:${env.IMAGE_TAG}"
                                sh "docker push ${FRONT_IMAGE}:${ENV_TAG}-latest"
                            }
                        }
                    }
                }
            }
        }

        stage('Backend Build & Push') {
            when { 
                expression { return isTargetBranch() }
                // anyOf { branch 'main'; branch 'develop' }
                // changeset "backend/**" 
            }
            steps {
                script {
                    dir('backend') {
                        sh "docker build -t ${BACK_IMAGE}:${env.IMAGE_TAG} ."
                        sh "docker tag ${BACK_IMAGE}:${env.IMAGE_TAG} ${BACK_IMAGE}:${ENV_TAG}-latest"
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh "docker login -u $USER -p $PASS"
                            sh "docker push ${BACK_IMAGE}:${env.IMAGE_TAG}"
                            sh "docker push ${BACK_IMAGE}:${ENV_TAG}-latest"
                        }
                    }
                }
            }
        }

        stage('K8s Manifest Update & Push') {
            when { 
                expression { return isTargetBranch() }
                // anyOf { branch 'main'; branch 'develop' } 
                }
            steps {
                script {
                    def backendSecretId = "backend-env-${ENV_TAG}"
                    
                    // 1. K8s Secret 업데이트
                    withCredentials([file(credentialsId: backendSecretId, variable: 'BACK_ENV_FILE')]) {
                        sh "kubectl create secret generic backend-secrets --from-env-file=${BACK_ENV_FILE} -n ${ENV_TAG} --dry-run=client -o yaml | kubectl apply -f -"
                    }

                    // 2. YAML 이미지 태그 업데이트
                    sh "sed -i 's|${FRONT_IMAGE}:.*|${FRONT_IMAGE}:${env.IMAGE_TAG}|g' k8s/frontend.yaml"
                    sh "sed -i 's|${BACK_IMAGE}:.*|${BACK_IMAGE}:${env.IMAGE_TAG}|g' k8s/backend.yaml"

                    // 3. SSAFY GitLab에 업데이트된 Manifest 푸시
                    withCredentials([usernamePassword(credentialsId: 'gitlab-auth', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh "git config user.email 'jenkins@ssafy.com'"
                        sh "git config user.name 'Jenkins-CI'"
                        sh "git add k8s/*.yaml"
                        sh "git commit -m 'chore(deploy): update image tag to ${env.IMAGE_TAG} [skip ci]'"
                        // 인증 정보를 포함한 SSAFY GitLab 주소로 푸시
                        sh "git push https://${GIT_USER}:${GIT_PASS}@${env.GITLAB_URL} HEAD:${env.BRANCH_NAME}"
                    }
                }
            }
        }
    }
}

def isTargetBranch() {
    // 젠킨스가 인식하는 여러 브랜치 변수들 중 하나라도 'main'이나 'develop'을 포함하는지 확인
    def b = env.GIT_BRANCH ?: env.BRANCH_NAME ?: env.gitlabTargetBranch ?: ""
    echo "--- 현재 브랜치 체크: ${b} ---"
    return b.contains('develop') || b.contains('main')
}