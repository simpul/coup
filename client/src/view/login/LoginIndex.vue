<style scoped lang="less">
.login-index-wrapper {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-around;

    .login-form {
        input, .ant-input-password {
            width: 500px;
        }
    }
}
</style>

<template>
    <div class="login-index-wrapper">
        <a-form
            :model="formState"
            name="login"
            class="login-form"
            :label-col="{ span: 8 }"
            :wrapper-col="{ span: 16 }"
            autocomplete="off"
            @finish="onFinish"
            @finishFailed="onFinishFailed"
        >
            <a-form-item
                label="Username"
                name="username"
                :rules="[{ required: true, message: 'Please input your username!' }]"
            >
                <a-input v-model:value="formState.username" />
            </a-form-item>

            <a-form-item
                label="Password"
                name="password"
                :rules="[{ required: true, message: 'Please input your password!' }]"
            >
                <a-input-password v-model:value="formState.password" />
            </a-form-item>

            <a-form-item name="remember" :wrapper-col="{ offset: 8, span: 16 }">
                <a-checkbox v-model:checked="formState.remember">Remember me</a-checkbox>
            </a-form-item>

            <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
                <a-button type="primary" html-type="submit">Submit</a-button>
            </a-form-item>
        </a-form>
    </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { setUsername } from '../../utils/cookie';

const router = useRouter();
const store = useStore();
const formState = reactive({
    username: '',
    password: '',
    remember: true,
});
const onFinish = values => {
    const { username } = values;
    setUsername(username);
    store.commit('updateStage', 'ready'); // 进入ready状态
    store.commit('updateUsername', username); // 更新用户名
    router.push('/game');
};
const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo);
};
</script>