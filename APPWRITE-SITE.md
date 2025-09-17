本项目可以通过 AppWrite Site 部署

在 AppWrite.io 注册之后创建项目, 参考 README 创建字段和设置权限, 打包之后在 AppWrite 后台 Sites 部署即可

修改之后先打包, 否则上传的不是最新版本

npm run build

tar -czvf release.tar.gz -C dist assets index.html

会生成一个文件到项目根目录, 通过 AppWrite Site 部署即可.

提示: 创建 Site 的时候不要填写 npm intall 和 npm run build 指令

因为已经是打包好了的
